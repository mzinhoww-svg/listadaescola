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
import { SaveButton } from "@/components/favorites/save-button";
import { ShareButton } from "@/components/lists/share-button";
import { PartnerOfferButton } from "@/components/commerce/partner-offer-button";
import { NearbyStoresSheet } from "@/components/stores/nearby-stores-sheet";
import { Badge } from "@/components/ui/badge";
import { jsonLdScript } from "@/lib/seo/json-ld";
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
    openGraph: { title, description, type: "website" },
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
  const itemsWithOffers = list.items.filter((item) => (offersByItem.get(item.id)?.length ?? 0) > 0);

  // Best-effort (RF-015): never blocks or fails the page render.
  void recordAnalyticsEvent({ eventType: "list_view", schoolId: list.school.id, listId: list.id });

  const requiredCount = list.items.filter((item) => item.is_required).length;
  const optionalCount = list.items.length - requiredCount;

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

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Itens da lista</h2>
          <p className="text-sm text-neutral-500">
            {list.items.length} {list.items.length === 1 ? "item" : "itens"}
            {optionalCount > 0 && ` · ${requiredCount} obrigatórios, ${optionalCount} opcionais`}
          </p>
        </div>

        <ul className="flex flex-col divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {list.items.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-medium text-neutral-900">
                  {item.quantity > 1 && <span className="text-neutral-500">{item.quantity}× </span>}
                  {item.name}
                </p>
                <Badge variant={item.is_required ? "neutral" : "info"}>
                  {item.is_required ? "Obrigatório" : "Opcional"}
                </Badge>
              </div>
              {(item.unit || item.brand) && (
                <p className="text-sm text-neutral-600">
                  {[item.unit, item.brand].filter(Boolean).join(" · ")}
                </p>
              )}
              {item.notes && <p className="text-sm text-neutral-500">{item.notes}</p>}
            </li>
          ))}
        </ul>
      </section>

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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="font-semibold text-neutral-900">Comprar online</h3>
            <p className="mb-4 mt-1 text-sm text-neutral-600">
              Lojas parceiras com oferta para os itens desta lista.
            </p>
            {itemsWithOffers.length > 0 ? (
              <div className="flex flex-col gap-4">
                {itemsWithOffers.map((item) => (
                  <div key={item.id}>
                    <p className="mb-2 text-sm font-medium text-neutral-700">{item.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {offersByItem.get(item.id)!.map((offer) => (
                        <PartnerOfferButton
                          key={offer.ecommerceProductId}
                          offer={offer}
                          schoolListItemId={item.id}
                          schoolId={list.school.id}
                          listId={list.id}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-surface-soft px-3 py-2.5 text-sm text-neutral-600">
                Nenhuma loja parceira tem oferta para os itens desta lista ainda.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="font-semibold text-neutral-900">Comprar local</h3>
            <p className="mb-4 mt-1 text-sm text-neutral-600">
              Peça orçamento em papelarias próximas da escola, direto pelo WhatsApp.
            </p>
            <NearbyStoresSheet schoolId={list.school.id} listId={list.id} />
          </div>
        </div>
      </section>
    </div>
  );
}
