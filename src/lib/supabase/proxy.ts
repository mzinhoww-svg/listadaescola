import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";
import { getSafeRedirect } from "@/lib/safe-redirect";

/** Route prefixes that require an authenticated user. Role-specific checks
 * (e.g. admin) happen server-side in that area's own layout, backed by a
 * real `profiles` read — this list only gates "is anyone logged in". */
const PROTECTED_PREFIXES = ["/minha-conta", "/enviar-lista", "/sugerir-escola", "/admin"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Refreshes the Supabase SSR session cookie on every matched request and
 * redirects anonymous visitors away from protected areas. Must use
 * `getUser()` (not `getSession()`): it revalidates the token against the
 * Supabase Auth server instead of just trusting the locally-decoded JWT.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && isProtected(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/entrar";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", getSafeRedirect(`${pathname}${search}`, pathname));
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
