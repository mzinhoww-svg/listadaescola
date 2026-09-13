/**
 * Fixtures de QA em produção.
 *
 * Auditorias automatizadas (impeccable `detect`, E2E) precisam que
 * `/listas/[slug]` e `/papelarias/.../[slug]` existam de verdade -- com a
 * base zerada as duas telas mais importantes do produto retornam 404 e
 * ficam sem cobertura em toda rodada (ver
 * `docs/implementation/impeccable-critique.md` §1.1). A saída é semear um
 * conjunto mínimo de linhas reais no banco de produção.
 *
 * O problema disso é que conteúdo semeado fica público e ancorado numa
 * escola INEP real: o sitemap submete toda lista publicada ao Google
 * (`src/app/sitemap.ts`) e a página emite JSON-LD `ItemList` nomeando a
 * escola. Uma lista de material fictícia indexada como conteúdo genuíno de
 * uma escola que existe é um dano real e difícil de desfazer -- uma família
 * pode agir em cima dela.
 *
 * Este módulo torna a fixture segura por construção, não por promessa de
 * remoção (a promessa anterior já falhou uma vez): todo slug com este
 * prefixo é excluído do sitemap e servido com `noindex, nofollow`. A
 * proteção contra o leitor humano não vem daqui, vem do conteúdo -- o
 * `series_name` e o nome da papelaria dizem, em texto visível, que aquilo é
 * teste.
 *
 * Procedimento de criação e remoção: `docs/operations/qa-fixtures.md`.
 */
export const QA_FIXTURE_SLUG_PREFIX = "qa-teste-";

/** Slug pertence a uma fixture de QA -- nunca indexar, nunca sitemap. */
export function isQaFixtureSlug(slug: string): boolean {
  return slug.startsWith(QA_FIXTURE_SLUG_PREFIX);
}
