import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getSafeRedirect } from "@/lib/safe-redirect";

/**
 * Lands here from every auth email link (signup confirmation, password
 * recovery, resend) via `emailRedirectTo`/`redirectTo=.../auth/callback`.
 * Exchanges the PKCE `code` for a real session, then forwards to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = getSafeRedirect(searchParams.get("next"), "/minha-conta");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/entrar?error=callback_failed`);
}
