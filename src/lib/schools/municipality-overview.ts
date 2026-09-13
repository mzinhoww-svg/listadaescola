import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import { isQaFixtureSlug } from "@/lib/qa/fixtures";
import { toDisplayCase } from "@/lib/utils";

export interface MunicipalitySchoolOption {
  id: string;
  /** Já em display case -- é o texto que vai direto para o `<option>`. */
  name: string;
}

export interface MunicipalityOverview {
  /** Total de escolas ativas do município (exato, vindo do count do PostgREST). */
  schoolCount: number;
  /** Escolas ativas em ordem alfabética, para o seletor do pedido de aviso. */
  schools: MunicipalitySchoolOption[];
  /** Listas publicadas nas escolas deste município. Zero hoje, e a página diz zero. */
  listCount: number;
  /** Escolas distintas com ao menos uma lista publicada. */
  schoolsWithListCount: number;
}

/**
 * Onda 10 -- o que a página de município precisa saber sobre si mesma.
 *
 * A página existia como uma grade de 20 cartões e uma linha de texto. Quem
 * chega de "lista de material escolar Cuiabá" faz uma pergunta que a grade
 * não responde -- "vocês têm a lista da escola do meu filho?" -- e a
 * resposta honesta hoje é "não, nenhuma das 384". Esta função busca os
 * números que permitem dizer isso sem inventar nada, e a lista de escolas
 * que permite capturar a intenção ali mesmo (RF: captura da Onda 3).
 *
 * `React.cache()` porque `generateMetadata` e o corpo da página precisam
 * dos mesmos números -- a descrição da página é construída a partir deles,
 * então sem isto seriam duas rodadas de query por request.
 *
 * O critério de "lista publicada" é o MESMO de `getCoverageSummary` e do
 * `list_count` de `search_schools` (school_lists.status = 'APPROVED', com a
 * escola ativa), não o mais estrito do sitemap: o texto de abertura desta
 * página não pode contradizer os selos dos cartões logo abaixo dela.
 *
 * Fixtures de QA ficam de fora, como em todo lugar que conta lista --
 * ver src/lib/qa/fixtures.ts.
 */
export const getMunicipalityOverview = cache(
  async (uf: string, municipality: string): Promise<MunicipalityOverview> => {
    const supabase = createPublicClient();

    const [schoolsResult, listsResult] = await Promise.all([
      supabase
        .from("schools")
        .select("id, name", { count: "exact" })
        .eq("uf", uf)
        .eq("municipality", municipality)
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("school_lists")
        .select("slug, school_id, schools!inner (municipality, uf, is_active)")
        .eq("status", "APPROVED")
        .eq("schools.uf", uf)
        .eq("schools.municipality", municipality)
        .eq("schools.is_active", true),
    ]);

    if (schoolsResult.error) {
      throw new Error(`getMunicipalityOverview (escolas) failed: ${schoolsResult.error.message}`);
    }
    if (listsResult.error) {
      throw new Error(`getMunicipalityOverview (listas) failed: ${listsResult.error.message}`);
    }

    const schoolsWithList = new Set<string>();
    let listCount = 0;
    for (const row of listsResult.data ?? []) {
      if (isQaFixtureSlug(row.slug)) continue;
      listCount += 1;
      schoolsWithList.add(row.school_id);
    }

    return {
      // `count` é o total real; `data` pode vir truncado pelo db-max-rows do
      // PostgREST (1000 nesta instância). Hoje o maior município de MT tem
      // 384 escolas, então o seletor está completo -- mas o número exibido
      // sai do count justamente para não passar a depender disso.
      schoolCount: schoolsResult.count ?? schoolsResult.data.length,
      schools: schoolsResult.data.map((row) => ({ id: row.id, name: toDisplayCase(row.name) })),
      listCount,
      schoolsWithListCount: schoolsWithList.size,
    };
  }
);
