import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Teto do bucket `public-assets` (20260910201800_storage.sql). Repetido
 * aqui só para a mensagem de erro sair legível antes de o Storage recusar. */
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_CAPTION_LENGTH = 200;
const MAX_PHOTOS_PER_SCHOOL = 12;

function sanitizeFileName(name: string) {
  const lastDot = name.lastIndexOf(".");
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot) : "";
  return `${base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "foto"}${ext.toLowerCase()}`;
}

/**
 * Onda 7 -- upload de foto da escola pelo gestor.
 *
 * Route Handler e não Server Action, pela mesma razão de
 * `/api/contributions/attachments`: Server Action carrega o limite de
 * corpo do Next (1MB por padrão), e o teto real aqui é o do bucket (5MB).
 *
 * As fotos entram com `is_approved = true`. Não é atalho de moderação: é
 * a decisão da Onda 7 (docs/product/school-claim.md) -- um gestor
 * verificado por humano é a fonte autoritativa da própria escola, do mesmo
 * jeito que publica a lista direto. `approved_by` fica NULL, o que é
 * literalmente verdade (nenhum admin revisou), e o trigger
 * `school_images_protect_admin_columns` garante isso mesmo contra uma
 * chamada direta ao PostgREST. Se o admin esconder a foto depois
 * (`is_approved = false`), o mesmo trigger impede o gestor de reverter.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sua sessão expirou. Recarregue a página." }, { status: 401 });
  }

  // SEC-008: mesmo mecanismo e mesma razão do upload de anexo -- é o
  // caminho com custo externo direto (armazenamento/banda). Checado antes
  // de ler o corpo, para não gastar banda num upload que será recusado.
  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    p_action: "school_photo_upload",
    p_max_hits: 20,
    p_window_minutes: 60,
  });
  if (allowed === false) {
    return NextResponse.json(
      { error: "Muitos envios de foto em pouco tempo. Aguarde e tente novamente." },
      { status: 429 }
    );
  }

  const formData = await request.formData();
  const schoolId = String(formData.get("school_id") ?? "");
  const caption = String(formData.get("caption") ?? "").trim();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhuma foto enviada." }, { status: 400 });
  }
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: "Envie uma imagem JPG, PNG ou WebP." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "A foto deve ter no máximo 5MB." }, { status: 400 });
  }
  if (caption.length > MAX_CAPTION_LENGTH) {
    return NextResponse.json({ error: "Legenda muito longa." }, { status: 400 });
  }

  // Guard de aplicação. A autorização real é a RLS (`public_assets_manager_insert`
  // no Storage e `school_images_manager_write` na tabela, ambas via
  // is_school_manager) -- isto só evita gravar o arquivo antes de
  // descobrir que a linha seria recusada.
  const { data: membership } = await supabase
    .from("school_managers")
    .select("id")
    .eq("school_id", schoolId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "Você não gerencia esta escola." }, { status: 403 });
  }

  const { count } = await supabase
    .from("school_images")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if ((count ?? 0) >= MAX_PHOTOS_PER_SCHOOL) {
    return NextResponse.json(
      { error: `Limite de ${MAX_PHOTOS_PER_SCHOOL} fotos por escola atingido. Remova alguma antes de enviar outra.` },
      { status: 409 }
    );
  }

  // Convenção de caminho do bucket: schools/{school_id}/{arquivo}. É o que
  // `public_assets_manager_insert` inspeciona via storage.foldername().
  const storagePath = `schools/${schoolId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("public-assets")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    return NextResponse.json({ error: "Não foi possível enviar a foto." }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("school_images").insert({
    school_id: schoolId,
    storage_path: storagePath,
    caption: caption || null,
    is_approved: true,
    submitted_by: user.id,
  });
  if (insertError) {
    // Sem isto sobraria um arquivo órfão no bucket, invisível e cobrando
    // armazenamento -- mesma limpeza do upload de anexo.
    await supabase.storage.from("public-assets").remove([storagePath]);
    return NextResponse.json({ error: "Não foi possível salvar a foto." }, { status: 500 });
  }

  await supabase.rpc("record_rate_limit_hit", { p_action: "school_photo_upload" });
  return NextResponse.json({ ok: true });
}
