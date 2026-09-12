import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  EDITABLE_SUBMISSION_STATUSES,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "@/lib/contributions/constants";

const MAX_FILE_NAME_LENGTH = 200;

function sanitizeFileName(name: string) {
  const lastDot = name.lastIndexOf(".");
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot) : "";
  return `${base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "arquivo"}${ext.toLowerCase()}`;
}

/**
 * Uploads a submission attachment. Runs entirely server-side (Route
 * Handler, not a direct browser-to-Storage upload): keeps every Supabase
 * call on the already-proxied/session-bound server client instead of
 * requiring a second, browser-only Supabase client whose auth calls have
 * no server-side counterpart to fall back on. Route Handlers don't carry
 * Next's Server-Action body-size cap, so the bucket's own 10MB limit
 * (storage.sql) stays the real ceiling.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sua sessão expirou. Recarregue a página." }, { status: 401 });
  }

  // SEC-008 (hardening pós-MVP): o único endpoint do produto com custo
  // externo direto (armazenamento/banda do Supabase Storage) -- checado
  // antes de ler o corpo da requisição, para não gastar banda mesmo em
  // upload que será recusado.
  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    p_action: "attachment_upload",
    p_max_hits: 20,
    p_window_minutes: 60,
  });
  if (allowed === false) {
    return NextResponse.json({ error: "Muitos envios de arquivo em pouco tempo. Aguarde e tente novamente." }, { status: 429 });
  }

  const formData = await request.formData();
  const submissionId = String(formData.get("submission_id") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }
  if (!(ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: "Envie um PDF, JPG ou PNG." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return NextResponse.json({ error: "O arquivo deve ter no máximo 10MB." }, { status: 400 });
  }

  const { data: submission, error: submissionError } = await supabase
    .from("list_submissions")
    .select("id, submitted_by, status")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError || !submission || submission.submitted_by !== user.id) {
    return NextResponse.json({ error: "Envio não encontrado." }, { status: 404 });
  }
  if (!EDITABLE_SUBMISSION_STATUSES.includes(submission.status as (typeof EDITABLE_SUBMISSION_STATUSES)[number])) {
    return NextResponse.json({ error: "Este envio não pode mais ser editado." }, { status: 409 });
  }

  const storagePath = `${user.id}/${submissionId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("submissions")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    return NextResponse.json({ error: "Não foi possível enviar o arquivo." }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("submission_attachments").insert({
    submission_id: submissionId,
    storage_path: storagePath,
    file_name: file.name.slice(0, MAX_FILE_NAME_LENGTH),
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by: user.id,
  });
  if (insertError) {
    await supabase.storage.from("submissions").remove([storagePath]);
    return NextResponse.json({ error: "Não foi possível salvar o anexo." }, { status: 500 });
  }

  await supabase.rpc("record_rate_limit_hit", { p_action: "attachment_upload" });
  return NextResponse.json({ ok: true });
}
