import { createPublicClient } from "@/lib/supabase/public";
import { isQaFixtureSlug } from "@/lib/qa/fixtures";

export interface CoveredMunicipality {
  name: string;
  listCount: number;
}

export interface CoverageSummary {
  uf: string;
  schoolCount: number;
  municipalityCount: number;
  /** Municípios com ao menos uma lista publicada, do maior para o menor. Vazio hoje -- e a home diz isso em vez de esconder. */
  municipalitiesWithList: CoveredMunicipality[];
  listCount: number;
}

/**
 * Onda 3. O que a home tem de verdade para mostrar.
 *
 * O lugar destas duas seções era ocupado por "Escolas em destaque" e
 * "Listas recentes", as duas condicionais e as duas vazias: destaque exige
 * patrocínio ou verificação de admin (nenhum existe ainda, e afrouxar isso
 * seria inventar curadoria), lista exige contribuição aprovada (também
 * nenhuma). Resultado: a home terminava com dois saltos de 4rem e cara de
 * página inacabada, sem dizer nada.
 *
 * O que ela tem de real é cobertura: 2.722 escolas mapeadas em 141
 * municípios de MT, vindas do censo INEP. Isso é um número honesto e é
 * exatamente a pergunta anterior à lista -- "a minha escola está aí?".
 *
 * Toda contagem aqui sai de query, nenhuma é constante escrita à mão
 * (CLAUDE.md: nunca fabricar dado). Quando a primeira lista real for
 * publicada, `municipalitiesWithList` deixa de ser vazio sozinho, sem que
 * ninguém precise editar texto.
 *
 * Fixtures de QA ficam de fora de propósito. Hoje a única linha aprovada
 * em `school_lists` é a fixture `qa-teste-...` (ver src/lib/qa/fixtures.ts),
 * conteúdo declaradamente fictício que o projeto já exclui do sitemap e
 * serve com noindex. Contá-la faria a home anunciar "Cuiabá já tem lista"
 * e levar uma família até uma lista que diz, no próprio título, que é
 * teste. Dizer zero é a informação correta.
 */
export async function getCoverageSummary(uf = "MT"): Promise<CoverageSummary> {
  const supabase = createPublicClient();

  const [municipalitiesResult, listsResult] = await Promise.all([
    supabase.rpc("list_municipalities", { p_uf: uf }),
    // Mesmo critério de `list_count` no search_schools e do filtro
    // ?lista=com em /escolas (school_lists.status = APPROVED), para que a
    // home não prometa uma cobertura que o catálogo não confirme.
    supabase
      .from("school_lists")
      .select("slug, schools!inner (municipality, uf, is_active)")
      .eq("status", "APPROVED")
      .eq("schools.uf", uf)
      .eq("schools.is_active", true),
  ]);

  if (municipalitiesResult.error) {
    throw new Error(`getCoverageSummary (municípios) failed: ${municipalitiesResult.error.message}`);
  }
  if (listsResult.error) {
    throw new Error(`getCoverageSummary (listas) failed: ${listsResult.error.message}`);
  }

  const municipalities = municipalitiesResult.data ?? [];
  const schoolCount = municipalities.reduce((total, row) => total + Number(row.school_count), 0);

  const listsByMunicipality = new Map<string, number>();
  let listCount = 0;
  for (const row of listsResult.data ?? []) {
    if (isQaFixtureSlug(row.slug)) continue;
    const municipality = row.schools.municipality;
    if (!municipality) continue;
    listCount += 1;
    listsByMunicipality.set(municipality, (listsByMunicipality.get(municipality) ?? 0) + 1);
  }

  const municipalitiesWithList = Array.from(listsByMunicipality, ([name, count]) => ({ name, listCount: count })).sort(
    (a, b) => b.listCount - a.listCount || a.name.localeCompare(b.name, "pt-BR")
  );

  return {
    uf,
    schoolCount,
    municipalityCount: municipalities.length,
    municipalitiesWithList,
    listCount,
  };
}
