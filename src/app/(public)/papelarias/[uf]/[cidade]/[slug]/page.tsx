import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock, MapPin, MessageCircle, ShoppingBag, Truck } from "lucide-react";

import { getStoreBySlug, storeHref } from "@/lib/stores/store-profile";
import { normalizeWhatsappNumber } from "@/lib/stores/whatsapp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Map } from "@/components/map/map";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { getSiteBaseUrl } from "@/lib/seo/site-url";

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
          {store.isSponsored && (
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
            <Button asChild>
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
            {store.contacts.map((contact, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="text-neutral-400">{contact.contactType}:</span> {contact.value}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
