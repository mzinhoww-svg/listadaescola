import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getActiveStores, storeHref } from "@/lib/stores/store-profile";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { getSiteBaseUrl } from "@/lib/seo/site-url";
import { slugify } from "@/lib/utils";

// Same reasoning as every other Supabase-backed public page: never
// statically prerendered.
export const dynamic = "force-dynamic";

interface CidadePageProps {
  params: Promise<{ uf: string; cidade: string }>;
}

/**
 * Stores don't have a `resolveMunicipalitySlug`-equivalent RPC (that
 * helper is schools-specific, see municipalities.ts) -- with at most 500
 * active stores per UF (see getActiveStores' MAX_ROWS comment) filtering
 * the already-cached list in memory is simpler than adding a second RPC
 * for what's a much smaller table than schools.
 */
async function getStoresForCity(uf: string, citySlug: string) {
  const stores = await getActiveStores(uf);
  return stores.filter((store) => slugify(store.municipality) === citySlug);
}

export async function generateMetadata({ params }: CidadePageProps): Promise<Metadata> {
  const { uf, cidade } = await params;
  const stores = await getStoresForCity(uf.toUpperCase(), cidade);
  if (stores.length === 0) return {};

  const municipality = stores[0].municipality;
  const title = `Papelarias em ${municipality}`;
  const description = `Papelarias ativas em ${municipality}, ${uf.toUpperCase()}, para comprar material escolar local.`;

  return {
    title,
    description,
    alternates: { canonical: `/papelarias/${uf.toLowerCase()}/${cidade}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function PapelariasCidadePage({ params }: CidadePageProps) {
  const { uf, cidade } = await params;
  const ufUpper = uf.toUpperCase();
  const stores = await getStoresForCity(ufUpper, cidade);
  if (stores.length === 0) notFound();

  const municipality = stores[0].municipality;
  const siteUrl = getSiteBaseUrl();
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Papelarias", item: `${siteUrl}/papelarias` },
      {
        "@type": "ListItem",
        position: 3,
        name: municipality,
        item: `${siteUrl}/papelarias/${uf.toLowerCase()}/${cidade}`,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }} />

      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-neutral-500">
        <Link href="/" className="hover:text-primary-700">
          Início
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/papelarias" className="hover:text-primary-700">
          Papelarias
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-neutral-700">{municipality}</span>
      </nav>

      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">Papelarias em {municipality}</h1>
      <p className="mb-6 text-neutral-600">{stores.length} papelarias ativas.</p>

      <h2 className="sr-only">Resultados</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {stores.map((store) => (
          <Link
            key={store.id}
            href={storeHref(store)}
            className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-primary-300"
          >
            <p className="font-medium text-neutral-900">{store.name}</p>
            {store.address && <p className="mt-1 text-sm text-neutral-600">{store.address}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
