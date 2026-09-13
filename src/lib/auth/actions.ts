"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSafeRedirect } from "@/lib/safe-redirect";
import {
  isValidEmail,
  RESEND_RATE_LIMIT_PREFIX,
  RESEND_WINDOW_MINUTES,
} from "@/lib/auth/verification";

export interface FormState {
  error?: string;
  success?: string;
  /** Per-field messages, keyed by form field `name`, so a form can pass
   * each one to its own Input as `errorText` (aria-describedby/aria-invalid)
   * instead of a single summary the screen reader has no way to tie back
   * to the offending field. `error` stays for messages that aren't about
   * one specific field (a failed request, an expired link). */
  fieldErrors?: Record<string, string>;
}

const MIN_PASSWORD_LENGTH = 8;

/** Best-effort base URL for building auth email redirect links. Reads the
 * actual host the visitor is on (works for prod + every Vercel preview
 * deployment) rather than an env var, since a hardcoded URL would be wrong
 * for preview deployments or a custom domain. */
async function getSiteUrl() {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  if (host) return `${protocol}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Best-effort client IP for the pre-auth rate limit keys below. */
async function getClientIp() {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

/**
 * SEC-008: rate-limit key for login attempts. Combines email + a
 * best-effort client IP (x-forwarded-for) rather than email alone, so an
 * attacker spamming failed attempts against a victim's email from one
 * network doesn't also lock that victim out of logging in from their own
 * -- see the migration this reads from (gap_fixes_prompt20.sql) for the
 * full reasoning.
 */
async function getLoginRateLimitIdentifier(email: string) {
  return `${email.toLowerCase()}:${await getClientIp()}`;
}

/**
 * SEC-008 aplicado ao reenvio de confirmação. Mesmo mecanismo do login
 * (`check_login_rate_limit`/`record_login_attempt`), não o genérico
 * `check_rate_limit`/`record_rate_limit_hit`: o genérico é pós-auth por
 * construção -- identifica por `auth.uid()`, é fail-closed quando ele é
 * nulo e nem tem grant de EXECUTE para `anon`
 * (20260912000000_hardening_rn004_sec008_expand.sql). Reenviar confirmação
 * acontece, por definição, antes de existir sessão, então o genérico
 * negaria 100% dos pedidos. O par de login é o mecanismo pré-auth deste
 * projeto: `anon` pode executar e o identificador é texto livre.
 *
 * O prefixo mantém os dois baldes separados -- reenvio nunca consome
 * tentativa de login, login nunca consome reenvio.
 */
async function getResendRateLimitIdentifier(email: string) {
  return `${RESEND_RATE_LIMIT_PREFIX}:${email.toLowerCase()}:${await getClientIp()}`;
}

export async function signInAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = getSafeRedirect(String(formData.get("next") ?? ""), "/minha-conta");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();
  const identifier = await getLoginRateLimitIdentifier(email);

  // Fails open on an unexpected RPC error (`allowed` stays null/undefined,
  // never strictly `false`) -- a secondary safety check should never
  // become a primary outage vector for the whole login flow.
  const { data: allowed } = await supabase.rpc("check_login_rate_limit", { p_identifier: identifier });
  if (allowed === false) {
    return { error: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  void supabase.rpc("record_login_attempt", { p_identifier: identifier, p_success: !error });
  if (error) {
    // Deliberately generic: never reveal whether the email exists.
    return { error: "E-mail ou senha inválidos." };
  }

  redirect(next);
}

export async function signUpAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!fullName) return { fieldErrors: { full_name: "Informe seu nome." } };
  if (!isValidEmail(email)) return { fieldErrors: { email: "Informe um e-mail válido." } };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { fieldErrors: { password: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` } };
  }
  if (password !== confirmPassword) return { fieldErrors: { confirm_password: "As senhas não coincidem." } };

  // Mesmo destino que o login já preserva (RF de "voltar pro que eu tava
  // fazendo") -- sem isto, o link de confirmação de e-mail sempre mandava
  // pra /minha-conta, perdendo qualquer fluxo que trouxe a pessoa até o
  // cadastro (ex.: rascunho anônimo do wizard, sub-projeto papelaria #1).
  const next = getSafeRedirect(String(formData.get("next") ?? ""), "/minha-conta");

  const siteUrl = await getSiteUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { fieldErrors: { email: "Este e-mail já está cadastrado. Tente entrar ou recuperar sua senha." } };
    }
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  redirect(`/auth/verificar-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordResetAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!isValidEmail(email)) return { fieldErrors: { email: "Informe um e-mail válido." } };

  const siteUrl = await getSiteUrl();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/auth/redefinir-senha")}`,
  });

  // Same message whether or not the email has an account — otherwise this
  // becomes an account-enumeration oracle (SEC-003 posture applied to auth
  // itself, not just admin actions).
  return { success: "Se esse e-mail tiver uma conta, enviamos um link de redefinição de senha." };
}

export async function updatePasswordAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { fieldErrors: { password: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` } };
  }
  if (password !== confirmPassword) return { fieldErrors: { confirm_password: "As senhas não coincidem." } };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Link inválido ou expirado. Solicite uma nova redefinição de senha." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Não foi possível redefinir a senha. Tente novamente." };
  }

  redirect("/minha-conta");
}

/**
 * Only touches `full_name` -- role is never in the update payload, so the
 * profiles_update_own RLS check (role must stay equal to its current
 * stored value) always passes here regardless of the caller's role.
 */
export async function updateProfileAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { fieldErrors: { full_name: "Informe seu nome." } };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  revalidatePath("/minha-conta");
  revalidatePath("/minha-conta/perfil");
  return { success: "Perfil atualizado." };
}

/**
 * Reenvia o e-mail de confirmação de cadastro.
 *
 * Honestidade deliberada nas mensagens (ver `docs/operations/smtp-setup.md`):
 * esta ação confirma que *pediu* um novo envio, nunca que o e-mail foi
 * entregue. Enquanto o SMTP próprio não estiver configurado, o SMTP embutido
 * do Supabase se recusa a entregar para endereços fora do time do projeto, e
 * a resposta da API não é um sinal confiável de entrega.
 *
 * Os erros do Supabase são deliberadamente engolidos, e isso NÃO é
 * descuido: `POST /auth/v1/resend` só falha quando existe uma conta não
 * confirmada naquele endereço (verificado ao vivo em 2026-09-13 -- endereço
 * inexistente e conta já confirmada devolvem `HTTP 200 {}` sem tentar
 * enviar; a conta não confirmada devolveu `HTTP 429
 * over_email_send_rate_limit` dentro do cooldown e `HTTP 400
 * email_address_invalid` fora dele). Repassar esses erros para a tela
 * transformaria o formulário num oráculo de enumeração de contas -- a mesma
 * postura já aplicada em `requestPasswordResetAction`. O operador enxerga a
 * causa real pelo `console.error` abaixo (logs da Vercel), o usuário final
 * enxerga sempre a mesma resposta.
 */
export async function resendVerificationAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!isValidEmail(email)) return { fieldErrors: { email: "Informe um e-mail válido." } };
  const next = getSafeRedirect(String(formData.get("next") ?? ""), "/minha-conta");

  const supabase = await createClient();
  const identifier = await getResendRateLimitIdentifier(email);

  // Fail-open num erro inesperado da RPC (`allowed` fica null/undefined,
  // nunca estritamente `false`) -- mesmo critério do login: uma checagem
  // secundária não pode virar o motivo de a tela inteira parar de
  // funcionar.
  const { data: allowed } = await supabase.rpc("check_login_rate_limit", { p_identifier: identifier });
  if (allowed === false) {
    return {
      error: `Muitos pedidos de reenvio para este e-mail. Aguarde ${RESEND_WINDOW_MINUTES} minutos e tente novamente.`,
    };
  }

  const siteUrl = await getSiteUrl();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  // `p_success: false` é o que faz o contador andar: `check_login_rate_limit`
  // só conta linhas com `success = false` na janela. Awaited, ao contrário do
  // `void` do login -- lá a RPC é telemetria de apoio a um fluxo que o próprio
  // GoTrue já protege; aqui ela É o limite, e uma promise solta pode não
  // completar antes de a Server Action responder.
  await supabase.rpc("record_login_attempt", { p_identifier: identifier, p_success: false });

  if (error) {
    console.error("resendVerificationAction: Supabase recusou o reenvio", error.status, error.code);
  }

  return {
    success:
      "Pedimos um novo envio. Se existir uma conta ainda não confirmada neste e-mail, o link chega em alguns minutos — confira também a caixa de spam.",
  };
}
