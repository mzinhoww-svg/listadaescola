import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, GraduationCap } from "lucide-react";

import { getListBySlug } from "@/lib/lists/list-detail";
import { schoolHref } from "@/components/schools/school-card";
import { recordAnalyticsEvent } from "@/lib/analytics/record-event";
import { getCurrentUser } from "@/lib/auth/session";
import { isFavorited } from "@/lib/favorites/queries";
import { getOffersByListItemId } from "@/lib/commerce/offers";
import { buildListCommerceCoverage } from "@/lib/commerce/coverage";
import { SaveButton } from "@/components/favorites/save-button";
import { ShareButton } from "@/components/lists/share-button";
import { OnlineOffersPanel } from "@/components/commerce/online-offers-panel";
import { NearbyStoresSheet } from "@/components/stores/nearby-stores-sheet";
import { ListChecklist } from "@/components/lists/list-checklist";
import { Badge } from "@/components/ui/badge";
import { isQaFixtureSlug } from "@/lib/qa/fixtures";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { OG_DEFAULTS } from "@/lib/seo/metadata";
import { getSiteBaseUrl } from "@/lib/seo/site-url";

// Same reasoning as Home/perfil da escola: data depends on Supabase at
// request time, must never be statically prerendered at `next build`.
export const dynamic = "force-dynamic";

interface ListPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ListPageProps): Promise<Metadata> {
  const { slug } = await params;
  const list = await getListBySlug(slug);
  if (!list) return {};

  const title = `Lista — ${list.seriesName} · ${list.schoolYear} — ${list.school.name}`;
  const description = `Lista escolar de material para ${list.seriesName} (${list.schoolYear}) da ${list.school.name}, em ${list.school.municipality}/${list.school.uf}. ${list.items.length} itens.`;

  return {
    title,
    description,
    alternates: { canonical: `/listas/${list.slug}` },
    openGraph: { ...OG_DEFAULTS, title, description, type: "website" },
    // Fixture de QA: conteúdo fictício ancorado numa escola INEP real,
    // nunca indexável. Ver src/lib/qa/fixtures.ts.
    ...(isQaFixtureSlug(list.slug) ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function ListPage({ params }: ListPageProps) {
  const { slug } = await params;
  const list = await getListBySlug(slug);
  if (!list) notFound();

  const [user, offersByItem] = await Promise.all([
    getCurrentUser(),
    getOffersByListItemId(list.items.map((item) => item.id)),
  ]);
  const favorited = user ? await isFavorited("LIST", list.id) : false;
  const path = `/listas/${list.slug}`;
  const coverage = buildListCommerceCoverage(list.items, offersByItem);

  // Best-effort (RF-015): never blocks or fails the page render.
  void recordAnalyticsEvent({ eventType: "list_view", schoolId: list.school.id, listId: list.id });
  // Um evento por parceiro realmente renderizado no bloco de cobertura --
  // mesmo padrão de recordSchoolImpressions. É o denominador que faltava
  // para medir CTR por parceiro (Onda 8: "relatório que feche o laço").
  void Promise.all(
    coverage.partners.map((partner) =>
      recordAnalyticsEvent({
        eventType: "commerce_coverage_impression",
        schoolId: list.school.id,
        listId: list.id,
        partnerId: partner.partnerId,
        metadata: {
          coveredItems: partner.coveredCount,
          totalItems: coverage.totalItems,
          pricedItems: partner.pricedCount,
          estimatedTotal: partner.estimatedTotal,
        },
      })
    )
  );

  const siteUrl = getSiteBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Lista de material — ${list.seriesName} (${list.schoolYear}) — ${list.school.name}`,
    numberOfItems: list.items.length,
    itemListElement: list.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.quantity > 1 ? `${item.quantity}x ${item.name}` : item.name,
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: siteUrl },
      { "@type": "ListItem", position: 2, name: list.school.name, item: `${siteUrl}${schoolHref(list.school)}` },
      { "@type": "ListItem", position: 3, name: "Lista", item: `${siteUrl}${path}` },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }} />

      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-neutral-500">
        <Link href="/" className="hover:text-primary-700">
          Início
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={schoolHref(list.school)} className="hover:text-primary-700">
          {list.school.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-neutral-700">Lista</span>
      </nav>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">
            <GraduationCap className="size-3" aria-hidden="true" />
            {list.educationLevel}
          </Badge>
          <Badge variant="neutral">
            <CalendarDays className="size-3" aria-hidden="true" />
            Ano letivo {list.schoolYear}
          </Badge>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">{list.seriesName}</h1>

        <p className="text-neutral-600">
          <Link href={schoolHref(list.school)} className="font-medium text-primary-700 hover:underline">
            {list.school.name}
          </Link>{" "}
          — {list.school.municipality}, {list.school.uf}
        </p>

        <div className="flex flex-wrap gap-2">
          <SaveButton
            targetType="LIST"
            targetId={list.id}
            isAuthenticated={Boolean(user)}
            initialFavorited={favorited}
            path={path}
          />
          <ShareButton
            title={`Lista de material — ${list.seriesName} (${list.schoolYear}) — ${list.school.name}`}
            path={path}
            schoolId={list.school.id}
            listId={list.id}
          />
        </div>
      </header>

      <ListChecklist
        slug={list.slug}
        items={list.items}
        copyHeading={`${list.seriesName} · ${list.schoolYear} — ${list.school.name}`}
      />

      {/*
        "Onde comprar" é uma etapa da jornada (escola → lista → materiais →
        onde comprar), não um rodapé. Os dois canais ficam sempre visíveis:
        antes, "Comprar online" sumia inteiro quando nenhum item tinha oferta
        mapeada -- que é justamente o estado inicial de um marketplace sem
        parceiros cadastrados ainda, quando o usuário mais precisa entender
        que o canal existe. Nenhum dos dois processa pagamento: e-commerce
        termina em link externo + tracking, papelaria termina em WhatsApp.
      */}
      <section className="mt-10">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-neutral-900">Onde comprar</h2>
          <p className="mt-1 max-w-[65ch] text-sm text-neutral-600">
            Escolha como resolver esta lista. O Listada não processa pagamentos: você compra direto no
            site do parceiro ou combina com a papelaria pelo WhatsApp.
          </p>
        </div>

        {/* Lado a lado só enquanto os dois canais cabem compactos. Com
            cobertura de parceiro renderizada, "Comprar online" precisa da
            largura inteira -- em duas colunas dentro de max-w-3xl o cartão
            de cobertura fica com ~350px e o texto da estimativa (que é
            justamente a parte que não pode ficar ilegível) espreme. */}
        <div className={coverage.partners.length > 0 ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="font-semibold text-neutral-900">Comprar online</h3>
            <p className="mb-4 mt-1 max-w-[65ch] text-sm text-neutral-600">
              Quanto da sua lista cada loja parceira resolve. Você compra no site delas — o Listada só mostra o
              caminho.
            </p>
            <OnlineOffersPanel
              coverage={coverage}
              items={list.items}
              offersByItem={offersByItem}
              schoolId={list.school.id}
              listId={list.id}
            />
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="font-semibold text-neutral-900">Comprar local</h3>
            <p className="mb-4 mt-1 max-w-[65ch] text-sm text-neutral-600">
              A lista inteira vai pronta no WhatsApp da papelaria. Havendo mais de uma perto da escola, dá para
              mandar a mesma lista para todas e comparar os orçamentos que voltarem.
            </p>
            <NearbyStoresSheet schoolId={list.school.id} listId={list.id} />
          </div>
        </div>
      </section>
    </div>
  );
}
