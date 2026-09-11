"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSafeRedirect } from "@/lib/safe-redirect";

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function isValidEmail(email: string) {
  return EMAIL_RE.test(email);
}

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

/**
 * SEC-008: rate-limit key for login attempts. Combines email + a
 * best-effort client IP (x-forwarded-for) rather than email alone, so an
 * attacker spamming failed attempts against a victim's email from one
 * network doesn't also lock that victim out of logging in from their own
 * -- see the migration this reads from (gap_fixes_prompt20.sql) for the
 * full reasoning.
 */
async function getLoginRateLimitIdentifier(email: string) {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  return `${email.toLowerCase()}:${ip}`;
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

  const siteUrl = await getSiteUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/minha-conta")}`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { fieldErrors: { email: "Este e-mail já está cadastrado. Tente entrar ou recuperar sua senha." } };
    }
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  redirect(`/auth/verificar-email?email=${encodeURIComponent(email)}`);
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

export async function resendVerificationAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!isValidEmail(email)) return { fieldErrors: { email: "Informe um e-mail válido." } };

  const siteUrl = await getSiteUrl();
  const supabase = await createClient();
  await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/minha-conta")}`,
    },
  });

  return { success: "Se ainda não tiver sido confirmado, reenviamos o e-mail de verificação." };
}
