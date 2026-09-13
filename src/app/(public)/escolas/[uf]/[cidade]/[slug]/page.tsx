import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AtSign, BadgeCheck, ChevronDown, Globe, MapPin, MessageCircle, Phone, Star } from "lucide-react";

import { getSchoolBySlug, getSchoolLists, groupEtapasSeriesListas } from "@/lib/schools/school-profile";
import { schoolHref } from "@/components/schools/school-card";
import { getPublicAssetUrl } from "@/lib/supabase/storage";
import { recordAnalyticsEvent } from "@/lib/analytics/record-event";
import { getCurrentUser } from "@/lib/auth/session";
import { isFavorited } from "@/lib/favorites/queries";
import { getApprovedReviews, getOwnReview } from "@/lib/reviews/queries";
import { isEntitySponsored } from "@/lib/campaigns/public";
import { SaveButton } from "@/components/favorites/save-button";
import { NearbyStoresSheet } from "@/components/stores/nearby-stores-sheet";
import { ReviewForm } from "@/components/reviews/review-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { normalizeWhatsappNumber } from "@/lib/stores/whatsapp";
import { contactTypeLabel, formatSchoolAddress } from "@/lib/schools/format";
import { EmptyState } from "@/components/ui/empty-state";
import { Map } from "@/components/map/map";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { buildEntityTitle, OG_DEFAULTS } from "@/lib/seo/metadata";
import { getSiteBaseUrl } from "@/lib/seo/site-url";
import { cn, slugify, toDisplayCase } from "@/lib/utils";

// Same reasoning as Home (src/app/(public)/page.tsx): this page's data
// depends on Supabase at request time, so it must never be statically
// prerendered at `next build`.
export const dynamic = "force-dynamic";

interface SchoolPageProps {
  params: Promise<{ uf: string; cidade: string; slug: string }>;
}

export async function generateMetadata({ params }: SchoolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  if (!school) return {};

  const description =
    school.school_profiles?.description?.slice(0, 155) ??
    `${school.name} em ${school.municipality}, ${school.uf}. Etapas de ensino, contato e listas escolares.`;
  const logoUrl = school.school_profiles?.logo_url ? getPublicAssetUrl(school.school_profiles.logo_url) : undefined;

  return {
    title: buildEntityTitle(toDisplayCase(school.name), school.municipality, school.uf),
    description,
    alternates: { canonical: schoolHref(school) },
    openGraph: {
      ...OG_DEFAULTS,
      title: school.name,
      description,
      type: "website",
      images: logoUrl ? [{ url: logoUrl }] : undefined,
    },
  };
}

export default async function SchoolPage({ params }: SchoolPageProps) {
  const { uf, cidade, slug } = await params;
  const school = await getSchoolBySlug(slug);
  if (!school) notFound();

  const canonicalPath = schoolHref(school);

  if (canonicalPath !== `/escolas/${uf}/${cidade}/${slug}`) {
    redirect(canonicalPath);
  }

  const [lists, user] = await Promise.all([getSchoolLists(school.id), getCurrentUser()]);
  const [favorited, reviews, ownReview, isSponsored] = await Promise.all([
    user ? isFavorited("SCHOOL", school.id) : Promise.resolve(false),
    getApprovedReviews(school.id),
    user ? getOwnReview(school.id) : Promise.resolve(null),
    // Live campaign check, same predicate search_schools() uses for
    // listings -- school_profiles.is_sponsored is a static column nothing
    // ever writes to (confirmed by grep), which used to make this exact
    // page the one place a sponsored school didn't show its own badge.
    isEntitySponsored("SCHOOL", school.id),
  ]);
  const etapaGroups = groupEtapasSeriesListas(school.school_series, lists);
  const profile = school.school_profiles;
  // Onda 2 P7: normaliza no servidor (RF-012). Número que não for um
  // brasileiro válido não vira link -- mesma disciplina de não fabricar.
  const whatsappDigits = profile?.whatsapp ? normalizeWhatsappNumber(profile.whatsapp) : null;
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : null;

  // Best-effort (RF-015): never blocks or fails the page render.
  void recordAnalyticsEvent({ eventType: "school_view", schoolId: school.id });

  const hasContact = Boolean(school.phone || profile?.website || profile?.instagram || profile?.whatsapp) ||
    school.school_contacts.length > 0;

  const logoUrl = profile?.logo_url ? getPublicAssetUrl(profile.logo_url) : undefined;
  const imageUrls = school.school_images.map((image) => getPublicAssetUrl(image.storage_path));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "School",
    name: school.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: school.address ?? undefined,
      addressLocality: school.municipality,
      addressRegion: school.uf,
      postalCode: school.cep ?? undefined,
      addressCountry: "BR",
    },
    ...(school.latitude !== null && school.longitude !== null
      ? { geo: { "@type": "GeoCoordinates", latitude: school.latitude, longitude: school.longitude } }
      : {}),
    // Same field the page already trusts enough to render as a `tel:` link
    // just below (RN-009 discipline: never declare what the app itself
    // wouldn't use) -- no separate validation needed since none gates the
    // visible link either.
    ...(school.phone ? { telephone: school.phone } : {}),
    ...(logoUrl ? { logo: logoUrl } : {}),
    ...(imageUrls.length > 0 ? { image: imageUrls } : {}),
  };

  const siteUrl = getSiteBaseUrl();
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Escolas", item: `${siteUrl}/escolas/${school.uf.toLowerCase()}` },
      {
        "@type": "ListItem",
        position: 3,
        name: school.municipality,
        item: `${siteUrl}${canonicalPath.split("/").slice(0, 4).join("/")}`,
      },
      { "@type": "ListItem", position: 4, name: school.name, item: `${siteUrl}${canonicalPath}` },
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
        <Link href={`/escolas/${school.uf.toLowerCase()}`} className="hover:text-primary-700">
          Escolas
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/escolas/${school.uf.toLowerCase()}/${slugify(school.municipality)}`}
          className="hover:text-primary-700"
        >
          {school.municipality}
        </Link>
      </nav>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {isSponsored && (
            <Badge variant="sponsored" className="w-fit">
              PATROCINADA
            </Badge>
          )}
          <Badge variant={school.school_type === "PUBLIC" ? "info" : "neutral"}>
            {school.school_type === "PUBLIC" ? "Pública" : "Privada"}
          </Badge>
          {profile?.is_verified && (
            <Badge variant="success">
              <BadgeCheck className="size-3" aria-hidden="true" />
              Verificada
            </Badge>
          )}
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          {toDisplayCase(school.name)}
        </h1>

        <p className="flex items-start gap-1.5 text-neutral-600">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{formatSchoolAddress(school.address, school.municipality, school.uf)}</span>
        </p>

        <div>
          <SaveButton
            targetType="SCHOOL"
            targetId={school.id}
            isAuthenticated={Boolean(user)}
            initialFavorited={favorited}
            path={canonicalPath}
          />
        </div>
      </header>

      {school.latitude !== null && school.longitude !== null && (
        <section className="mt-6">
          <Map
            center={{ lat: school.latitude, lon: school.longitude }}
            markers={[{ id: school.id, lat: school.latitude, lon: school.longitude, label: school.name }]}
            className="overflow-hidden rounded-xl"
            height={280}
          />
        </section>
      )}

      {profile?.description && (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-semibold text-neutral-900">Sobre</h2>
          <p className="whitespace-pre-line text-neutral-700">{profile.description}</p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">Contato</h2>
        {hasContact ? (
          <ul className="flex flex-col gap-2 text-sm text-neutral-700">
            {school.phone && (
              <li className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
                {/* Onda 2 P7: era texto puro. Num produto mobile-first, a mãe
                    via o número e tinha que decorar ou copiar à mão. */}
                <a href={`tel:${school.phone.replace(/[^\d+]/g, "")}`} className="text-primary-700 hover:underline">
                  {school.phone}
                </a>
              </li>
            )}
            {profile?.website && (
              <li className="flex items-center gap-2">
                <Globe className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-700 hover:underline"
                >
                  {profile.website}
                </a>
              </li>
            )}
            {profile?.instagram && (
              <li className="flex items-center gap-2">
                <AtSign className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
                {profile.instagram}
              </li>
            )}
            {profile?.whatsapp && (
              <li className="flex items-center gap-2">
                <MessageCircle className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
                {/* Onda 2 P7: idem, e o canal local do produto *é* o WhatsApp.
                    Normalizado no servidor (RF-012); se o número não for um
                    brasileiro válido, cai para texto em vez de gerar um link
                    quebrado -- mesma disciplina de não fabricar. */}
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-700 hover:underline"
                  >
                    {profile.whatsapp}
                  </a>
                ) : (
                  profile.whatsapp
                )}
              </li>
            )}
            {school.school_contacts.map((contact) => (
              <li key={contact.id} className="flex items-center gap-2">
                <span className="text-neutral-600">{contactTypeLabel(contact.contact_type)}:</span> {contact.value}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">Nenhum contato público informado ainda.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">Etapas de ensino</h2>
        {school.school_education_levels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {school.school_education_levels.map((level) => (
              <Badge key={level.id} variant="neutral">
                {level.education_level}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Etapas de ensino não informadas.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-lg font-semibold text-neutral-900">Séries e listas escolares</h2>
        <p className="mb-4 max-w-[65ch] text-sm text-neutral-500">Escolha a série e o ano letivo para ver a lista de material.</p>
        {etapaGroups.length === 0 ? (
          /*
             Onda 2 P1: este é o momento de maior intenção do produto inteiro
             -- a mãe está com a lista de papel na mão e acabou de confirmar
             que a escola é a certa. A resposta era "volte depois", sem saída,
             enquanto /enviar-lista só era alcançável de dois lugares do site
             público que ela não tem motivo para visitar. O EmptyState já
             suportava `action`; ninguém tinha usado.
          */
          <EmptyState
            title="Nenhuma lista publicada ainda"
            description="Se você tem a lista desta escola em mãos, pode enviá-la — depois de aprovada, ela fica disponível para todas as famílias."
            action={
              <Button asChild>
                <Link href={`/enviar-lista?escola=${school.id}`}>Enviar a lista desta escola</Link>
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {etapaGroups.map((group) => (
              <details key={group.etapa} className="group rounded-xl border border-neutral-200 p-4" open>
                <summary className="flex cursor-pointer list-none items-center justify-between text-base font-medium text-neutral-900">
                  {group.etapa}
                  <ChevronDown
                    className="size-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  {group.series.map((serie) => (
                    <div key={serie.serieName}>
                      <p className="text-sm font-medium text-neutral-700">{serie.serieName}</p>
                      {serie.lists.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {serie.lists.map((list) => (
                            <Link
                              key={list.id}
                              href={`/listas/${list.slug}`}
                              className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100"
                            >
                              Ano letivo {list.schoolYear}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500">
                          Ainda sem lista publicada para esta série.
                          <Link
                            href={`/enviar-lista?escola=${school.id}`}
                            className="font-medium text-primary-700 hover:underline"
                          >
                            Enviar esta lista
                          </Link>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-lg font-semibold text-neutral-900">Papelarias próximas</h2>
        <p className="mb-3 max-w-[65ch] text-sm text-neutral-500">
          Peça um orçamento de material escolar direto no WhatsApp de uma papelaria da região.
        </p>
        <NearbyStoresSheet schoolId={school.id} />
      </section>

      {school.school_images.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-neutral-900">Fotos</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {school.school_images.map((image) => (
              <div key={image.id} className="relative aspect-square w-full overflow-hidden rounded-lg">
                <Image
                  src={getPublicAssetUrl(image.storage_path)}
                  alt={image.caption ?? school.name}
                  fill
                  sizes="(min-width: 640px) 33vw, 50vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">Avaliações</h2>

        {reviews.length > 0 ? (
          <>
            <Badge variant="neutral" className="mb-4 w-fit">
              <Star className="size-3" aria-hidden="true" />
              {(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)} (
              {reviews.length})
            </Badge>
            <ul className="mb-6 flex flex-col gap-3">
              {reviews.map((review) => (
                <li key={review.id} className="rounded-xl border border-neutral-200 p-4">
                  <div className="flex items-center gap-0.5 text-warning-500" aria-label={`Nota ${review.rating} de 5`}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={cn("size-4", index < review.rating ? "fill-current" : "text-neutral-300")}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  {review.comment && <p className="mt-2 text-sm text-neutral-700">{review.comment}</p>}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mb-4 text-sm text-neutral-500">Nenhuma avaliação publicada ainda.</p>
        )}

        {user ? (
          !ownReview || ownReview.status === "PENDING" || ownReview.status === "REJECTED" ? (
            <div className="flex flex-col gap-3">
              {ownReview?.status === "REJECTED" && (
                <p className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
                  Sua avaliação anterior não foi aprovada
                  {ownReview.rejectionReason ? `: ${ownReview.rejectionReason}. ` : ". "}
                  Você pode enviar uma nova abaixo.
                </p>
              )}
              <ReviewForm schoolId={school.id} path={canonicalPath} existing={ownReview ?? undefined} />
            </div>
          ) : (
            <p className="text-sm text-neutral-600">Sua avaliação foi publicada. Obrigado!</p>
          )
        ) : (
          <p className="text-sm text-neutral-600">
            <Link
              href={`/auth/entrar?next=${encodeURIComponent(canonicalPath)}`}
              className="font-medium text-primary-700 hover:underline"
            >
              Entre na sua conta
            </Link>{" "}
            para avaliar esta escola.
          </p>
        )}
      </section>
    </div>
  );
}
