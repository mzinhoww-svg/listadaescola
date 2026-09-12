import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AtSign, Clock, Globe, MapPin, MessageCircle, ShoppingBag, Truck } from "lucide-react";

import { getStoreBySlug, storeHref } from "@/lib/stores/store-profile";
import { normalizeWhatsappNumber } from "@/lib/stores/whatsapp";
import { getNearbySchools } from "@/lib/schools/nearby-schools";
import { schoolHref } from "@/components/schools/school-card";
import { isEntitySponsored } from "@/lib/campaigns/public";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Map } from "@/components/map/map";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { getSiteBaseUrl } from "@/lib/seo/site-url";
import { toDisplayCase } from "@/lib/utils";

// Prompt 18 (performance audit) investigated switching this to ISR
// (`export const revalidate = 3600`) since, unlike every other public
// page, this one reads no searchParams/cookies/headers. Reverted after
// live verification: Next.js's route-segment `revalidate` (this app's
// caching model, no `cacheComponents` flag) only governs `fetch()`-based
// requests -- confirmed live via Supabase edge_logs that the REST call
// inside getStoreBySlug() still ran on every request regardless, so the
// change was a silent no-op, not a real fix. The correct mechanism is
// `unstable_cache()` wrapping getStoreBySlug() with `tags`, plus a
// `revalidateTag()` call added to upsertStoreAction (admin/store-actions.ts)
// so an admin's edit doesn't sit stale on the public page for the whole
// window -- real work with real invalidation-correctness risk, not a
// one-line change, so left as a follow-up rather than shipped half-done.
// Same reasoning as every other Supabase-backed public page: never
// statically prerendered.
export const dynamic = "force-dynamic";

interface StorePageProps {
  params: Promise<{ uf: string; cidade: string; slug: string }>;
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) return {};

  const description = `${store.name} em ${store.municipality}, ${store.uf}. Peça orçamento de material escolar direto pelo WhatsApp.`;

  return {
    title: `${store.name} — ${store.municipality}/${store.uf}`,
    description,
    alternates: { canonical: storeHref(store) },
    openGraph: { title: store.name, description, type: "website" },
  };
}

export default async function StorePage({ params }: StorePageProps) {
  const { uf, cidade, slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  const canonicalPath = storeHref(store);
  if (canonicalPath !== `/papelarias/${uf}/${cidade}/${slug}`) {
    redirect(canonicalPath);
  }

  const whatsappNormalized = normalizeWhatsappNumber(store.whatsapp);
  const whatsappHref = whatsappNormalized ? `/api/store/whatsapp?store=${store.id}` : null;

  const [isSponsored, nearbySchools] = await Promise.all([
    // Live campaign check -- same fix as the school profile page, same
    // reason: store.isSponsored is a static column nothing ever writes to.
    isEntitySponsored("STORE", store.id),
    // Reverse of the school profile's "papelarias próximas": proximity
    // only (RN-009, never a confirmed service relationship the data
    // doesn't back), same nearby_schools() RPC the CEP fallback already
    // uses elsewhere.
    getNearbySchools({ uf: store.uf, lat: store.latitude, lon: store.longitude, municipality: store.municipality }),
  ]);

  const siteUrl = getSiteBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: store.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: store.address ?? undefined,
      addressLocality: store.municipality,
      addressRegion: store.uf,
      addressCountry: "BR",
    },
    ...(store.latitude !== null && store.longitude !== null
      ? { geo: { "@type": "GeoCoordinates", latitude: store.latitude, longitude: store.longitude } }
      : {}),
    ...(whatsappNormalized ? { telephone: `+${whatsappNormalized}` } : {}),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Papelarias", item: `${siteUrl}/papelarias` },
      { "@type": "ListItem", position: 3, name: store.name, item: `${siteUrl}${canonicalPath}` },
    ],
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }} />

      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-neutral-500">
        <Link href="/" className="hover:text-primary-700">
          Início
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/papelarias" className="hover:text-primary-700">
          Papelarias
        </Link>
      </nav>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {isSponsored && (
            <Badge variant="sponsored" className="w-fit">
              PATROCINADA
            </Badge>
          )}
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">{store.name}</h1>

        <p className="flex items-start gap-1.5 text-neutral-600">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {store.address ? `${store.address} — ` : ""}
            {store.municipality}, {store.uf}
          </span>
        </p>

        {store.openingHours && (
          <p className="flex items-center gap-1.5 text-neutral-600">
            <Clock className="size-4 shrink-0" aria-hidden="true" />
            {store.openingHours}
          </p>
        )}

        {(store.offersDelivery || store.offersPickup) && (
          <div className="flex flex-wrap gap-2">
            {store.offersDelivery && (
              <Badge variant="info">
                <Truck className="size-3" aria-hidden="true" />
                Entrega
              </Badge>
            )}
            {store.offersPickup && (
              <Badge variant="info">
                <ShoppingBag className="size-3" aria-hidden="true" />
                Retirada
              </Badge>
            )}
          </div>
        )}

        <div>
          {whatsappHref ? (
            <Button asChild variant="whatsapp">
              <a href={whatsappHref} target="_blank" rel="nofollow noopener noreferrer">
                <MessageCircle className="size-4" aria-hidden="true" />
                Pedir orçamento no WhatsApp
              </a>
            </Button>
          ) : (
            <p className="text-sm text-neutral-500">WhatsApp indisponível para esta papelaria.</p>
          )}
        </div>
      </header>

      {store.latitude !== null && store.longitude !== null && (
        <section className="mt-6">
          <Map
            center={{ lat: store.latitude, lon: store.longitude }}
            markers={[{ id: store.id, lat: store.latitude, lon: store.longitude, label: store.name }]}
            className="overflow-hidden rounded-xl"
            height={280}
          />
        </section>
      )}

      {store.services.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-neutral-900">Serviços</h2>
          <div className="flex flex-wrap gap-2">
            {store.services.map((service) => (
              <Badge key={service} variant="neutral">
                {service}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {store.contacts.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-neutral-900">Contato</h2>
          <ul className="flex flex-col gap-2 text-sm text-neutral-700">
            {store.contacts.map((contact, index) => {
              if (contact.contactType === "website") {
                return (
                  <li key={index} className="flex items-center gap-2">
                    <Globe className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
                    <a
                      href={contact.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-700 hover:underline"
                    >
                      {contact.value}
                    </a>
                  </li>
                );
              }
              if (contact.contactType === "instagram") {
                return (
                  <li key={index} className="flex items-center gap-2">
                    <AtSign className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
                    {contact.value}
                  </li>
                );
              }
              return (
                <li key={index} className="flex items-center gap-2">
                  <span className="text-neutral-600">{contact.contactType}:</span> {contact.value}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {nearbySchools.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 text-lg font-semibold text-neutral-900">Escolas próximas</h2>
          <p className="mb-3 text-sm text-neutral-500">
            Escolas na região -- não é uma lista de escolas atendidas oficialmente.
          </p>
          <ul className="flex flex-col gap-2">
            {nearbySchools.map((school) => (
              <li key={school.id}>
                <Link
                  href={schoolHref(school)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm hover:border-primary-300 hover:bg-primary-50"
                >
                  <span className="font-medium text-neutral-900">{toDisplayCase(school.name)}</span>
                  {school.distanceKm !== null && (
                    <span className="shrink-0 text-neutral-500">{school.distanceKm} km</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
