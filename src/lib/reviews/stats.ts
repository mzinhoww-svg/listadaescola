import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";

/**
 * Onda 9. Quantas avaliações moderadas existem no site inteiro.
 *
 * Existe por um motivo estreito: o filtro "Avaliação mínima" e a ordenação
 * "Avaliação" de /escolas operam sobre `avg_rating`, que em search_schools é
 * `coalesce(r.avg_rating, 0)`. Com zero avaliações publicadas, escolher
 * "4+ estrelas" filtra 2.722 escolas reais para zero resultados, e a tela
 * respondia "Nenhuma escola encontrada / tente ajustar os filtros" -- que
 * atribui à escola um problema que é do catálogo. Saber o total permite
 * dizer a causa verdadeira em vez de deixar o usuário concluir a errada.
 *
 * Fica num arquivo próprio, e não em `src/lib/reviews/queries.ts`, porque
 * aquele arquivo está sendo editado por outra sessão em paralelo (PR #38).
 *
 * `null` = não foi possível saber. Deliberado: devolver 0 numa falha de
 * rede afirmaria "não existe avaliação nenhuma" e desligaria controles com
 * base num erro. Quem consome trata `null` como "não desabilite nada".
 */
export const getPublishedReviewCount = cache(async (): Promise<number | null> => {
  const supabase = createPublicClient();
  const { count, error } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("status", "APPROVED");

  if (error) return null;
  return count ?? 0;
});
