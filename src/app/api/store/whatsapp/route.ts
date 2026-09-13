import { NextResponse, type NextRequest } from "next/server";

import { createPublicClient } from "@/lib/supabase/public";
import { recordAnalyticsEvent } from "@/lib/analytics/record-event";
import { buildGenericWhatsappMessage, buildWhatsappMessage, normalizeWhatsappNumber } from "@/lib/stores/whatsapp";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string | null): value is string {
  return value !== null && UUID_RE.test(value);
}

/**
 * Onda 6 -- cookie de sessão (sem Max-Age: morre quando o navegador
 * fecha) com um UUID aleatório e nada mais. Existe por um motivo só:
 * deduplicar a caixa de pedidos da papelaria, para que um mesmo visitante
 * voltando ao botão em poucos minutos não vire três pedidos. NÃO é
 * analytics, não é publicidade, não sai daqui e nunca é gravado no banco:
 * `record_store_quote_request` guarda apenas o SHA-256 dele combinado com
 * papelaria e lista. Documentado em /cookies.
 */
const QUOTE_SESSION_COOKIE = "le_orcamento_sid";

/**
 * The only outbound path for "Comprar local" (Prompt 09, PRD RF-011/012).
 * `store`/`school`/`list` are only ever lookup keys -- the phone number
 * always comes from `stores.whatsapp` (admin-only-writable) resolved
 * here server-side, normalized and validated (RF-012) before any link is
 * built. wa.me only pre-fills WhatsApp's own compose screen; it never
 * sends on its own ("não enviar automaticamente").
 *
 * `school`/`list` are optional (Prompt 15): the standalone papelaria
 * detail page has no school-list context to build an itemized message
 * from, so it links here with only `store` and gets a generic message
 * instead of a 404-to-home. When both are present, behavior is unchanged
 * from Prompt 09 -- the itemized message still requires a real, published
 * list with at least one item.
 *
 * `whatsapp_click` is awaited, same reasoning as `/api/commerce/click`:
 * this Route Handler ends the instant it returns its redirect response,
 * so a detached insert risks never flushing.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const storeId = searchParams.get("store");
  const schoolIdParam = searchParams.get("school");
  const listIdParam = searchParams.get("list");
  const hasListContext = schoolIdParam !== null || listIdParam !== null;

  if (!isUuid(storeId) || (hasListContext && (!isUuid(schoolIdParam) || !isUuid(listIdParam)))) {
    return NextResponse.redirect(new URL("/", origin));
  }
  const schoolId = hasListContext ? (schoolIdParam as string) : null;
  const listId = hasListContext ? (listIdParam as string) : null;

  const supabase = createPublicClient();

  const [{ data: store }, { data: school }, { data: list }] = await Promise.all([
    supabase.from("stores").select("name, whatsapp").eq("id", storeId).eq("is_active", true).maybeSingle(),
    schoolId ? supabase.from("schools").select("name").eq("id", schoolId).maybeSingle() : Promise.resolve({ data: null }),
    listId
      ? supabase.from("school_lists").select("series_name, school_year").eq("id", listId).eq("status", "APPROVED").maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!store || (hasListContext && (!school || !list))) {
    return NextResponse.redirect(new URL("/", origin));
  }

  const normalizedPhone = normalizeWhatsappNumber(store.whatsapp);
  if (!normalizedPhone) {
    // Never generate a link from a phone number we can't trust.
    return NextResponse.redirect(new URL("/", origin));
  }

  let message: string;
  if (school && list && listId) {
    const { data: version } = await supabase
      .from("school_list_versions")
      .select("id, school_list_items (name, quantity, unit)")
      .eq("school_list_id", listId)
      .eq("status", "PUBLISHED")
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!version || version.school_list_items.length === 0) {
      return NextResponse.redirect(new URL("/", origin));
    }

    message = buildWhatsappMessage({
      schoolName: school.name,
      seriesName: list.series_name,
      schoolYear: list.school_year,
      items: version.school_list_items,
    });
  } else {
    message = buildGenericWhatsappMessage(store.name);
  }

  // Um clique aqui é a única evidência que existe de que a família pediu
  // orçamento -- depois do redirect a conversa é do WhatsApp e o produto
  // não vê mais nada. Por isso as duas escritas são aguardadas: este Route
  // Handler termina no instante em que devolve o redirect, e um insert
  // solto corre o risco de nunca ser enviado (mesmo motivo já registrado
  // para `whatsapp_click`).
  const sessionToken = request.cookies.get(QUOTE_SESSION_COOKIE)?.value ?? crypto.randomUUID();

  await Promise.all([
    recordAnalyticsEvent({
      eventType: "whatsapp_click",
      schoolId: schoolId ?? undefined,
      listId: listId ?? undefined,
      storeId,
    }),
    // Best-effort igual ao analytics: a RPC devolve `false` em vez de
    // estourar quando recusa (duplicata, teto por papelaria), e mesmo um
    // erro de rede não pode impedir a pessoa de chegar no WhatsApp.
    supabase
      .rpc("record_store_quote_request", {
        p_store_id: storeId,
        p_school_id: schoolId ?? undefined,
        p_school_list_id: listId ?? undefined,
        p_session_token: sessionToken,
      })
      .then(({ error }) => {
        if (error) console.error("record_store_quote_request failed", error.message);
      }),
  ]);

  const destination = new URL(`https://wa.me/${normalizedPhone}`);
  destination.searchParams.set("text", message);

  const response = NextResponse.redirect(destination);
  response.cookies.set(QUOTE_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
