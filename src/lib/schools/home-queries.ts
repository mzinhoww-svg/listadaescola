import { createPublicClient } from "@/lib/supabase/public";
import { QA_FIXTURE_SLUG_PREFIX } from "@/lib/qa/fixtures";

/*
 * Onda 3: `getFeaturedSchools()` saiu daqui junto com a seção "Escolas em
 * destaque" da home. A régua dela (só escola patrocinada ou verificada por
 * admin -- nunca uma amostra arbitrária vestida de curadoria) continua
 * correta e NÃO foi afrouxada; o problema é que não existe nenhuma das
 * duas coisas ainda, então a seção nunca renderizava e a função varria 50
 * linhas do `search_schools` a cada visita para filtrar tudo. A home
 * mostra cobertura real no lugar (`src/lib/schools/coverage.ts` e
 * `src/components/home/coverage-section.tsx`). Quando existir patrocínio
 * ou verificação, a seção de destaque volta -- com a mesma régua.
 */

export interface RecentList {
  id: string;
  slug: string;
  educationLevel: string;
  seriesName: string;
  schoolYear: number;
  publishedAt: string;
  school: { id: string; name: string; slug: string; municipality: string; uf: string };
}

/**
 * Home "listas recentes": only lists with a PUBLISHED version (the same
 * bar school_list_versions_select_published RLS enforces for anyone).
 * A seção continua condicional: quando existir lista real ela volta a
 * renderizar sozinha.
 *
 * Onda 3: passa a descartar fixtures de QA. A única linha aprovada em
 * produção hoje é `qa-teste-lista-educacao-infantil-2026` -- conteúdo
 * declaradamente fictício (o próprio `series_name` diz "não usar") que o
 * projeto já exclui do sitemap e serve com noindex (src/lib/qa/
 * fixtures.ts). Ela estava sendo anunciada como "lista recente" na home,
 * a página mais visível do produto, e uma família podia clicar. Além
 * disso contradizia, na mesma tela, a seção de cobertura logo acima, que
 * conta listas pelo mesmo critério e (corretamente) diz zero. O descarte
 * acontece no próprio filtro do PostgREST, não depois em memória, para que
 * `limit` continue devolvendo `limit` listas de verdade.
 */
export async function getRecentLists(uf = "MT", limit = 4): Promise<RecentList[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("school_list_versions")
    .select(
      `id, published_at,
       school_lists!inner (id, slug, education_level, series_name, school_year, status,
         schools!inner (id, name, slug, municipality, uf, is_active))`
    )
    .eq("status", "PUBLISHED")
    .eq("school_lists.status", "APPROVED")
    .eq("school_lists.schools.uf", uf)
    .eq("school_lists.schools.is_active", true)
    .not("school_lists.slug", "like", `${QA_FIXTURE_SLUG_PREFIX}%`)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getRecentLists failed: ${error.message}`);

  return (data ?? []).map((row) => {
    const list = row.school_lists;
    const school = list.schools;
    return {
      id: row.id,
      slug: list.slug,
      educationLevel: list.education_level,
      seriesName: list.series_name,
      schoolYear: list.school_year,
      publishedAt: row.published_at,
      school: { id: school.id, name: school.name, slug: school.slug, municipality: school.municipality, uf: school.uf },
    };
  });
}
