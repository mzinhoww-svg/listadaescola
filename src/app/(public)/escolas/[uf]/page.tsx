import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { searchSchools } from "@/lib/schools/search-schools";
import { listMunicipalities } from "@/lib/schools/municipalities";
import { recordPageView } from "@/lib/analytics/record-event";
import { SchoolCard } from "@/components/schools/school-card";
import { PaginationControls } from "@/components/schools/pagination-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { OG_DEFAULTS } from "@/lib/seo/metadata";
import { getSiteBaseUrl } from "@/lib/seo/site-url";

// Same reasoning as every other Supabase-backed public page: never
// statically prerendered.
export const dynamic = "force-dynamic";

// Escopo inicial do PRD é só MT (ver CLAUDE.md) -- qualquer outra UF 404,
// em vez de renderizar uma página de estado vazia/sem sentido.
const SUPPORTED_UFS = ["MT"];

const TOP_MUNICIPALITIES = 20;

const numberFormat = new Intl.NumberFormat("pt-BR");

interface EstadoPageProps {
  params: Promise<{ uf: string }>;
  searchParams: Promise<{ page?: string }>;
}

function isSupportedUf(uf: string): boolean {
  return SUPPORTED_UFS.includes(uf.toUpperCase());
}

function parsePage(pageParam: string | undefined): number {
  const parsed = Number(pageParam);
  return Number.isInteger(parsed) && parsed > 1 ? parsed : 1;
}

export async function generateMetadata({ params, searchParams }: EstadoPageProps): Promise<Metadata> {
  const { uf } = await params;
  if (!isSupportedUf(uf)) return {};

  const ufUpper = uf.toUpperCase();
  const municipalities = await listMunicipalities(ufUpper);
  const schoolCount = municipalities.reduce((total, municipality) => total + municipality.schoolCount, 0);
  const page = parsePage((await searchParams).page);

  const title = page > 1 ? `Escolas em ${ufUpper} — página ${page}` : `Escolas em ${ufUpper}`;
  // Números de query, não de molde -- e sem prometer lista, que é o que a
  // versão anterior fazia ("veja as listas de material escolar de cada
  // uma") sem existir uma única lista publicada no estado.
  const description =
    `${numberFormat.format(schoolCount)} escolas ativas em ${municipalities.length} cidades de ${ufUpper}, com dados do Censo Escolar do INEP. Encontre a escola do seu filho e a lista de material dela.` +
    (page > 1 ? ` Página ${page}.` : "");

  // Self-referencing por página: canonicalizar a página 7 na 1 declararia
  // as escolas 121-140 como duplicata e tiraria do índice o caminho de
  // rastreio até elas.
  const canonicalPath = `/escolas/${uf.toLowerCase()}`;

  return {
    title,
    description,
    alternates: { canonical: page > 1 ? `${canonicalPath}?page=${page}` : canonicalPath },
    openGraph: { ...OG_DEFAULTS, title, description, type: "website" },
  };
}

export default async function EstadoPage({ params, searchParams }: EstadoPageProps) {
  const { uf } = await params;
  if (!isSupportedUf(uf)) notFound();
  const ufUpper = uf.toUpperCase();
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const basePath = `/escolas/${uf.toLowerCase()}`;

  const [municipalities, result] = await Promise.all([
    listMunicipalities(ufUpper),
    searchSchools({ uf: ufUpper, sort: "popularity", page }),
  ]);

  // Mesma armadilha de rastreio fechada na página de município: sem isto,
  // ?page=9999 responde 200 com uma grade vazia.
  if (page > 1 && page > result.pageCount) notFound();

  // Best-effort (RF-015): never blocks or fails the page render.
  void recordPageView(`/escolas/${uf.toLowerCase()}`);

  const siteUrl = getSiteBaseUrl();
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: siteUrl },
      { "@type": "ListItem", position: 2, name: `Escolas em ${ufUpper}`, item: `${siteUrl}${basePath}` },
    ],
  };

  const topMunicipalities = municipalities.slice(0, TOP_MUNICIPALITIES);
  // Ordem alfabética no índice completo: o bloco acima já ordena por
  // tamanho, e repetir isso em 141 itens não ajuda ninguém a achar a
  // cidade que veio procurar.
  const allMunicipalities = [...municipalities].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }} />

      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-neutral-500">
        <Link href="/" className="hover:text-primary-700">
          Início
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-neutral-700">Escolas em {ufUpper}</span>
      </nav>

      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">
        Escolas em {ufUpper}
        {page > 1 && <span className="text-neutral-500"> — página {page}</span>}
      </h1>
      <p className="mb-6 max-w-2xl text-neutral-600">
        {numberFormat.format(result.totalCount)} escolas ativas em {municipalities.length} cidades.{" "}
        <Link href={`/escolas?uf=${ufUpper}`} className="font-medium text-primary-700 hover:underline">
          Buscar com filtros
        </Link>
        .
      </p>

      {municipalities.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-neutral-900">Cidades</h2>
          {/* Capped: an unprioritized wall of ~140 chips (real count for MT)
              pushed the section's actual content (a grade de escolas) far
              down the page on mobile, with no grouping by relevance. Top 20
              by school count covers the cities most visitors want. */}
          <div className="flex flex-wrap gap-2">
            {topMunicipalities.map((municipality) => (
              <Link
                key={municipality.slug}
                href={`${basePath}/${municipality.slug}`}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-primary-300 hover:text-primary-700"
              >
                {municipality.name} <span className="text-neutral-600">({municipality.schoolCount})</span>
              </Link>
            ))}
          </div>

          {/*
            Onda 10 -- o índice completo, e o motivo dele é ligação interna.
            Antes desta seção, as 20 maiores cidades eram as ÚNICAS páginas
            de município com link vindo de dentro do site; as outras 121
            existiam só no sitemap.xml, ou seja, sem nenhum sinal de
            navegação. E "use buscar com filtros para encontrá-las", que era
            a saída oferecida, não é um link para lugar nenhum: é um campo
            de formulário, que rastreador não preenche.

            Fica dentro de um <details> porque a crítica que motivou o corte
            em 20 continua certa -- 141 chips abertos empurram a grade de
            escolas para fora da primeira tela em 390px. Fechado, o conteúdo
            continua no HTML e os links continuam sendo seguidos; não é
            texto escondido, é um controle que a pessoa abre.
          */}
          {municipalities.length > topMunicipalities.length && (
            <details className="mt-3 rounded-xl border border-neutral-200 bg-white p-4">
              {/* min-h-11: o alvo de toque do DESIGN.md. Um <summary> só com
                  texto tem ~20px de altura, e ele é o único jeito de abrir
                  o índice -- o padding do <details> em volta não alterna. */}
              <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary-700">
                Ver todas as {municipalities.length} cidades de {ufUpper}
              </summary>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
                {allMunicipalities.map((municipality) => (
                  <li key={municipality.slug}>
                    <Link
                      href={`${basePath}/${municipality.slug}`}
                      className="flex min-h-11 items-center py-1 text-sm text-neutral-700 hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                    >
                      {/* Nome e contagem num único filho do flex: soltos, o
                          nome que quebra em duas linhas empurrava a
                          contagem para a direita, longe da cidade a que ela
                          se refere (visto em 390px). */}
                      <span>
                        {municipality.name} <span className="text-neutral-500">({municipality.schoolCount})</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      <section>
        {/* Era "Escolas em destaque". Não é destaque nenhum: é a listagem
            inteira ordenada por popularidade, página 1 de 137. Chamar de
            destaque inventa uma curadoria que não existe -- a mesma régua
            que fez a home NÃO montar uma seção de destaques. */}
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">Todas as escolas de {ufUpper}</h2>
        {result.schools.length === 0 ? (
          <EmptyState title="Nenhuma escola encontrada" description="Ainda não há escolas ativas cadastradas." />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.schools.map((school) => (
                <SchoolCard key={school.id} school={school} />
              ))}
            </div>
            <div className="mt-6">
              <PaginationControls
                page={result.page}
                pageCount={result.pageCount}
                searchParams={new URLSearchParams()}
                basePath={basePath}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
