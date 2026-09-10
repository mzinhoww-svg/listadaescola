"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSafeRedirect } from "@/lib/safe-redirect";

export interface FormState {
  error?: string;
  success?: string;
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

export async function signInAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = getSafeRedirect(String(formData.get("next") ?? ""), "/minha-conta");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
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

  if (!fullName) return { error: "Informe seu nome." };
  if (!isValidEmail(email)) return { error: "Informe um e-mail válido." };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (password !== confirmPassword) return { error: "As senhas não coincidem." };

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
      return { error: "Este e-mail já está cadastrado. Tente entrar ou recuperar sua senha." };
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
  if (!isValidEmail(email)) return { error: "Informe um e-mail válido." };

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
    return { error: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (password !== confirmPassword) return { error: "As senhas não coincidem." };

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

export async function resendVerificationAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!isValidEmail(email)) return { error: "Informe um e-mail válido." };

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
