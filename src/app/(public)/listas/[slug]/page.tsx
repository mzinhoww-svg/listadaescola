import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, GraduationCap } from "lucide-react";

import { getListBySlug } from "@/lib/lists/list-detail";
import { schoolHref } from "@/components/schools/school-card";
import { recordAnalyticsEvent } from "@/lib/analytics/record-event";
import { getCurrentUser } from "@/lib/auth/session";
import { isFavorited } from "@/lib/favorites/queries";
import { SaveButton } from "@/components/favorites/save-button";
import { ShareButton } from "@/components/lists/share-button";
import { Badge } from "@/components/ui/badge";

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

  const user = await getCurrentUser();
  const favorited = user ? await isFavorited("LIST", list.id) : false;
  const path = `/listas/${list.slug}`;

  // Best-effort (RF-015): never blocks or fails the page render.
  void recordAnalyticsEvent({ eventType: "list_view", schoolId: list.school.id, listId: list.id });

  const requiredCount = list.items.filter((item) => item.is_required).length;
  const optionalCount = list.items.length - requiredCount;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
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
    </div>
  );
}
