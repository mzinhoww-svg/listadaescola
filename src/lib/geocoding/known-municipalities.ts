import { unstable_cache } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";

/**
 * Lista de municípios que a nossa própria base conhece (INEP), por UF.
 *
 * Vivia dentro de `resolve-location.ts`. Saiu para cá na Onda 3 porque a
 * busca única da home (`src/lib/schools/home-search.ts`) precisa da mesma
 * lista para decidir se o que a pessoa digitou é uma cidade ou o nome de
 * uma escola -- e importar de um módulo `"use server"` não é possível sem
 * transformar isto numa Server Action, que é o que ela justamente não é.
 * A alternativa era duplicar a query e o cache nos dois lugares.
 *
 * Municípios só mudam numa reimportação do censo INEP, daí a cache de 1h:
 * evita refazer a leitura de ~2,7 mil linhas a cada busca por texto livre.
 * Usa o cliente público (sem cookie) porque `unstable_cache` proíbe
 * `cookies()`, e porque a lista é a mesma para qualquer visitante.
 */
export const getKnownMunicipalities = unstable_cache(
  async (uf: string): Promise<string[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase.from("schools").select("municipality").eq("uf", uf).eq("is_active", true);
    const unique = new Set((data ?? []).map((row) => row.municipality).filter((m): m is string => Boolean(m)));
    return Array.from(unique).sort();
  },
  ["known-municipalities"],
  { revalidate: 3600, tags: ["schools-municipalities"] }
);
