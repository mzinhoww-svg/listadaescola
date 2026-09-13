"use server";

import { createPublicClient } from "@/lib/supabase/public";

export interface FormState {
  error?: string;
  success?: string;
}

/** Igual ao CHECK do banco (20260913010000_list_notification_requests.sql).
 * Conservador de propósito: não tenta implementar a RFC 5322, que na
 * prática rejeita endereços válidos e frustra gente real. */
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const MAX_EMAIL_LENGTH = 254;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GENERIC_SUCCESS = "Pronto. Assim que a lista dessa escola for publicada, você recebe um aviso nesse e-mail.";

/**
 * Onda 3 -- "me avise quando publicarem a lista desta escola".
 *
 * Grava escola + e-mail e nada mais: sem conta, sem senha, sem perfil.
 * Exigir cadastro para dizer "me avisa" é justamente a fricção que faz a
 * intenção evaporar, e é o motivo desta Server Action existir em vez de um
 * fluxo de login.
 *
 * NÃO ENVIA E-MAIL, e isso é deliberado, não pendência esquecida: o SMTP
 * não está configurado neste projeto e o disparo é escopo de outra onda.
 * Aqui só se captura. O texto de sucesso promete o aviso, não o envio
 * imediato -- é o que a tabela realmente garante.
 *
 * Duplicata não vaza nada. A tabela é write-only para o público (RLS:
 * nenhuma policy de SELECT fora de admin), então esta Action -- que roda
 * com a chave anon -- também não consegue ler. Não há como checar antes se
 * o e-mail já existe, nem faria sentido: a resposta seria exatamente o
 * oráculo que a RLS existe para impedir ("fulano@x.com pediu aviso para a
 * escola Y?"). O caminho é inserir e tratar o 23505 da UNIQUE
 * (school_id, email) como sucesso, com a MESMA mensagem do caso novo.
 *
 * Usa o cliente público (anon, sem cookie) mesmo quando há sessão: a
 * captura é anônima por construção, não existe coluna de perfil aqui e não
 * há motivo para a requisição carregar identidade que não vai ser guardada.
 *
 * Sem rate limiting, por escolha registrada. O critério do projeto para
 * limitar (docs em 20260912000000_hardening_rn004_sec008_expand.sql) é
 * custo externo, fila de moderação ou escalonamento de privilégio -- esta
 * gravação não tem nenhum dos três, não dispara e-mail e a UNIQUE já
 * bloqueia repetição do mesmo par. Um limite aqui, além disso, seria
 * teatro: a policy de INSERT é aberta para anon, então o PostgREST aceita
 * a mesma escrita direto, sem passar por esta Action.
 */
export async function requestListNotificationAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!UUID_PATTERN.test(schoolId)) {
    return { error: "Não foi possível identificar a escola. Recarregue a página e tente de novo." };
  }
  if (!email) return { error: "Informe seu e-mail." };
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return { error: "Esse e-mail não parece válido. Confira e tente de novo." };
  }

  const supabase = createPublicClient();
  const { error } = await supabase.from("list_notification_requests").insert({ school_id: schoolId, email });

  // 23505 = unique_violation: já havia pedido para esta escola com este
  // e-mail. Do ponto de vista de quem pediu, o resultado é idêntico ("vou
  // ser avisada"), então a resposta é idêntica.
  if (error && error.code !== "23505") {
    // 23503 = FK: school_id não existe. Cai aqui de propósito, na mensagem
    // genérica -- confirmar "essa escola não existe" transformaria o
    // formulário num verificador de IDs.
    console.error("requestListNotificationAction failed", error.code, error.message);
    return { error: "Não foi possível registrar seu pedido agora. Tente novamente em instantes." };
  }

  return { success: GENERIC_SUCCESS };
}
