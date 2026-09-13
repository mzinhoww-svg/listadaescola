import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export interface ManagedStore {
  id: string;
  name: string;
  slug: string;
  uf: string;
  municipality: string;
  address: string | null;
  whatsapp: string;
  openingHours: string | null;
  offersDelivery: boolean;
  offersPickup: boolean;
  isActive: boolean;
  isSponsored: boolean;
  services: string[];
}

/**
 * A papelaria do gestor logado. `React.cache()` porque o layout de
 * `/minha-papelaria` e cada página filha precisam do mesmo registro.
 *
 * O recorte é feito por `store_managers` (a linha que prova a posse), e
 * não pelo papel `STORE_MANAGER` do perfil: papel é rótulo, vínculo é
 * fato. É também exatamente o que `is_store_manager()` -- o helper de RLS
 * -- consulta, então a tela e o banco concordam por construção. Duas
 * policies de SELECT cobrem a leitura de `stores` aqui:
 * `stores_select_active` (pública) e `stores_manager_select` (Onda 6, para
 * o caso de a papelaria estar desativada).
 *
 * Um gestor com mais de uma papelaria (o schema permite) vê a primeira por
 * ordem alfabética. Um seletor de papelaria é trabalho de quando existir
 * alguém nessa situação -- hoje não existe nenhum gestor no banco.
 */
export const getManagedStore = cache(async (): Promise<ManagedStore | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("store_managers")
    .select(
      `store_id,
       stores!inner (
         id, name, slug, uf, municipality, address, whatsapp, opening_hours,
         offers_delivery, offers_pickup, is_active, is_sponsored,
         store_services (service)
       )`
    )
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`getManagedStore failed: ${error.message}`);
  if (!data?.stores) return null;

  const store = data.stores;
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    uf: store.uf,
    municipality: store.municipality,
    address: store.address,
    whatsapp: store.whatsapp,
    openingHours: store.opening_hours,
    offersDelivery: store.offers_delivery,
    offersPickup: store.offers_pickup,
    isActive: store.is_active,
    isSponsored: store.is_sponsored,
    services: (store.store_services ?? []).map((row) => row.service).sort((a, b) => a.localeCompare(b, "pt-BR")),
  };
});

export interface StoreQuoteRequestItem {
  id: string;
  createdAt: string;
  school: { name: string; municipality: string } | null;
  list: { seriesName: string; schoolYear: number; slug: string } | null;
}

// Mesmo raciocínio de teto das outras listagens do projeto (ver
// admin/lists.ts). Paginação real quando houver volume que a justifique.
const MAX_ROWS = 200;

/**
 * A caixa de pedidos. Cada linha é um clique real no botão de WhatsApp,
 * registrado no servidor pelo redirect -- nunca um número escrito por
 * alguém. A RLS (`store_quote_requests_select_manager`) é o que impede um
 * gestor de ver os pedidos de outra papelaria; o `.eq("store_id", ...)`
 * aqui é só o recorte da tela.
 *
 * Não há nada sobre o visitante para mostrar, por decisão de projeto: o
 * gestor vê quando, de qual escola e de qual lista, e o resto da conversa
 * acontece no WhatsApp dele.
 */
export async function getStoreQuoteRequests(storeId: string): Promise<StoreQuoteRequestItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_quote_requests")
    .select(
      `id, created_at,
       schools (name, municipality),
       school_lists (series_name, school_year, slug)`
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .range(0, MAX_ROWS - 1);

  if (error) throw new Error(`getStoreQuoteRequests failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    school: row.schools ? { name: row.schools.name, municipality: row.schools.municipality } : null,
    list: row.school_lists
      ? {
          seriesName: row.school_lists.series_name,
          schoolYear: row.school_lists.school_year,
          slug: row.school_lists.slug,
        }
      : null,
  }));
}

export interface StoreQuoteSummary {
  total: number;
  last7Days: number;
  last30Days: number;
}

export function summarizeQuoteRequests(requests: readonly StoreQuoteRequestItem[]): StoreQuoteSummary {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  let last7Days = 0;
  let last30Days = 0;

  for (const request of requests) {
    const age = now - new Date(request.createdAt).getTime();
    if (age <= 7 * day) last7Days += 1;
    if (age <= 30 * day) last30Days += 1;
  }

  return { total: requests.length, last7Days, last30Days };
}
