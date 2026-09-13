import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BellRing, ListChecks } from "lucide-react";

import { searchSchools } from "@/lib/schools/search-schools";
import { resolveMunicipalitySlug } from "@/lib/schools/municipalities";
import { getMunicipalityOverview, type MunicipalityOverview } from "@/lib/schools/municipality-overview";
import { SchoolCard } from "@/components/schools/school-card";
import { PaginationControls } from "@/components/schools/pagination-controls";
import { ListNotificationForm } from "@/components/notifications/list-notification-form";
import { EmptyState } from "@/components/ui/empty-state";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { OG_DEFAULTS } from "@/lib/seo/metadata";
import { getSiteBaseUrl } from "@/lib/seo/site-url";
import { slugifyRouteSegment } from "@/lib/utils";

// Same reasoning as every other Supabase-backed public page: never
// statically prerendered.
export const dynamic = "force-dynamic";

interface CidadePageProps {
  params: Promise<{ uf: string; cidade: string }>;
  searchParams: Promise<{ page?: string }>;
}

function parsePage(pageParam: string | undefined): number {
  const parsed = Number(pageParam);
  return Number.isInteger(parsed) && parsed > 1 ? parsed : 1;
}

/**
 * Onda 10 -- a descrição sai dos números reais em vez de um molde.
 *
 * O texto anterior era "Escolas ativas em {cidade}, {UF}, com listas de
 * material escolar" nas 141 cidades. O problema não é a repetição em si (o
 * nome da cidade já diferenciava): é que a última parte é FALSA -- não
 * existe uma única lista publicada em MT, e prometer na SERP o que a página
 * não entrega é a versão SEO de fabricar dado.
 */
function buildCityDescription(municipality: string, uf: string, overview: MunicipalityOverview): string {
  if (overview.listCount === 0) {
    return `${overview.schoolCount} escolas de ${municipality} (${uf}) mapeadas pelo Censo Escolar do INEP. Nenhuma lista de material escolar publicada ainda — peça o aviso da sua escola.`;
  }
  const withList =
    overview.schoolsWithListCount === 1
      ? "1 delas já tem lista de material escolar publicada"
      : `${overview.schoolsWithListCount} delas já têm lista de material escolar publicada`;
  return `${overview.schoolCount} escolas de ${municipality} (${uf}); ${withList}. Veja a lista da sua escola ou peça o aviso quando ela sair.`;
}

/**
 * Coexists with escolas/[uf]/[cidade]/[slug]/page.tsx (school detail) --
 * Next.js resolves a page.tsx at a dynamic segment and a further nested
 * dynamic segment beneath it independently, no conflict.
 */
export async function generateMetadata({ params, searchParams }: CidadePageProps): Promise<Metadata> {
  const { uf, cidade } = await params;
  // resolve_municipality_slug() does an exact match against slugify(name)
  // -- normalize here so a link/bookmark using the city's natural
  // capitalization (e.g. "Comodoro", how it's displayed everywhere in the
  // UI, including this page's own breadcrumb) resolves instead of 404ing.
  const ufUpper = uf.toUpperCase();
  const municipality = await resolveMunicipalitySlug(ufUpper, slugifyRouteSegment(cidade));
  if (!municipality) return {};

  const overview = await getMunicipalityOverview(ufUpper, municipality);
  const page = parsePage((await searchParams).page);

  const title = page > 1 ? `Escolas em ${municipality} — página ${page}` : `Escolas em ${municipality}`;
  const description =
    buildCityDescription(municipality, ufUpper, overview) + (page > 1 ? ` Página ${page}.` : "");

  // Canonical a partir do SLUG normalizado, não do segmento cru: sem isto,
  // /escolas/mt/Cuiabá e /escolas/mt/cuiaba respondiam 200 cada uma
  // apontando o canonical para si mesma -- duas URLs indexáveis para a
  // mesma cidade. E cada página da paginação aponta para SI, não para a
  // página 1: canonicalizar a página 2 na 1 declara as escolas 21-40 como
  // duplicata e tira do índice o único caminho de rastreio até elas.
  const canonicalPath = `/escolas/${uf.toLowerCase()}/${slugifyRouteSegment(cidade)}`;
  const canonical = page > 1 ? `${canonicalPath}?page=${page}` : canonicalPath;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { ...OG_DEFAULTS, title, description, type: "website" },
  };
}

export default async function CidadePage({ params, searchParams }: CidadePageProps) {
  const { uf, cidade } = await params;
  const ufUpper = uf.toUpperCase();
  const citySlug = slugifyRouteSegment(cidade);
  const municipality = await resolveMunicipalitySlug(ufUpper, citySlug);
  if (!municipality) notFound();

  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const basePath = `/escolas/${uf.toLowerCase()}/${citySlug}`;

  // Mesma disciplina do perfil da escola: uma URL só por conteúdo. O
  // canonical sozinho é um pedido; o redirect é o que garante.
  if (`/escolas/${uf}/${cidade}` !== basePath) {
    redirect(page > 1 ? `${basePath}?page=${page}` : basePath);
  }

  const [overview, result] = await Promise.all([
    getMunicipalityOverview(ufUpper, municipality),
    searchSchools({ uf: ufUpper, municipality, sort: "popularity", page }),
  ]);

  // Armadilha de rastreio: sem isto, ?page=999 respondia 200 com uma grade
  // vazia -- infinitas URLs indexáveis sem conteúdo. A página 1 nunca cai
  // aqui, mesmo numa cidade sem escola ativa.
  if (page > 1 && page > result.pageCount) notFound();

  const siteUrl = getSiteBaseUrl();
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: siteUrl },
      { "@type": "ListItem", position: 2, name: `Escolas em ${ufUpper}`, item: `${siteUrl}/escolas/${uf.toLowerCase()}` },
      {
        "@type": "ListItem",
        position: 3,
        name: municipality,
        item: `${siteUrl}${basePath}`,
      },
    ],
  };

  const hasList = overview.listCount > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }} />

      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-neutral-500">
        <Link href="/" className="hover:text-primary-700">
          Início
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/escolas/${uf.toLowerCase()}`} className="hover:text-primary-700">
          Escolas em {ufUpper}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-neutral-700">{municipality}</span>
      </nav>

      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">
        Escolas em {municipality}
        {page > 1 && <span className="text-neutral-500"> — página {page}</span>}
      </h1>

      {/*
        Onda 10. Esta página é a superfície de maior intenção do produto
        ("lista de material escolar Cuiabá") e até aqui respondia com uma
        grade de 20 cartões e uma linha de contagem. A pergunta que trouxe a
        pessoa até aqui é "vocês têm a lista da escola do meu filho?", e a
        resposta honesta hoje é "não, de nenhuma das 384" -- dizer isso na
        abertura é melhor do que deixá-la varrer 20 cartões para descobrir
        sozinha. Quando a primeira lista da cidade for publicada, o texto
        troca sozinho: os dois números vêm de query.
      */}
      <p className="mb-4 max-w-[65ch] text-neutral-600">
        {overview.schoolCount} escolas ativas em {municipality}, {ufUpper}, com dados do Censo Escolar do INEP.{" "}
        {hasList ? (
          <>
            {overview.schoolsWithListCount === 1
              ? "1 delas já tem lista de material escolar publicada aqui"
              : `${overview.schoolsWithListCount} delas já têm lista de material escolar publicada aqui`}
            .{" "}
            <Link
              href={`/escolas?uf=${ufUpper}&municipality=${encodeURIComponent(municipality)}&lista=com`}
              className="font-medium text-primary-700 hover:underline"
            >
              Ver só as escolas com lista
            </Link>
            .
          </>
        ) : (
          <>
            <strong className="font-medium text-neutral-900">
              Nenhuma tem lista de material escolar publicada ainda.
            </strong>{" "}
            As listas vêm das famílias e das escolas — peça o aviso abaixo e você fica sabendo no dia em que a da sua
            escola sair.
          </>
        )}
      </p>

      <p className="mb-6 text-sm text-neutral-500">
        <Link
          href={`/escolas?uf=${ufUpper}&municipality=${encodeURIComponent(municipality)}`}
          className="font-medium text-primary-700 hover:underline"
        >
          Buscar com filtros
        </Link>{" "}
        (tipo, etapa de ensino, proximidade).
      </p>

      {result.schools.length === 0 ? (
        <EmptyState title="Nenhuma escola encontrada" description="Ainda não há escolas ativas nesta cidade." />
      ) : (
        <>
          <h2 className="sr-only">Resultados</h2>
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

      {/*
        Onda 10 -- a captura de intenção da Onda 3 deixa de existir só na
        home. Quem chega de busca orgânica cai AQUI, não na home, e até
        agora o desfecho mais comum desta página (nenhuma lista) não tinha
        saída nenhuma: a pessoa teria que voltar para a home e buscar de
        novo. Mesmo componente, mesma Server Action, mesma tabela -- a única
        diferença é que aqui a escola ainda não está identificada, então ele
        renderiza um seletor em vez de um campo oculto.
      */}
      {overview.schools.length > 0 && (
        <section className="mt-10 rounded-xl border border-neutral-200 bg-paper p-5 shadow-sm" aria-labelledby="aviso-titulo">
          <h2 id="aviso-titulo" className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
            <BellRing className="size-5 shrink-0 text-primary-600" aria-hidden="true" />
            Não achou a lista da sua escola?
          </h2>
          <p className="mb-4 mt-1 max-w-[65ch] text-sm text-neutral-600">
            Escolha a escola do seu filho e deixe seu e-mail. Assim que a lista dela for publicada, a gente avisa. Sem
            criar conta.
          </p>
          {/* Fechado de saída, por peso: em Cuiabá o seletor tem 384
              opções e renderizá-las no HTML de toda visita custava 15 KB
              comprimidos a mais na página (medido: 49 KB -> 34 KB) por um
              controle que a maioria não vai tocar. O texto acima já
              responde a pergunta que trouxe a pessoa até aqui; o
              formulário abre em um toque. */}
          <ListNotificationForm
            schools={overview.schools}
            triggerLabel="Escolher a escola e pedir o aviso"
          />
        </section>
      )}

      {hasList && (
        <p className="mt-6 flex items-center gap-2 text-sm text-neutral-600">
          <ListChecks className="size-4 shrink-0 text-primary-600" aria-hidden="true" />
          <Link href="/listas" className="font-medium text-primary-700 hover:underline">
            Ver todas as listas publicadas em {ufUpper}
          </Link>
        </p>
      )}
    </div>
  );
}
