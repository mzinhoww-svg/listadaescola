import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { HomeLocationSearch } from "@/components/home/home-location-search";
import { HomeNameSearch } from "@/components/home/home-name-search";
import { SchoolCard } from "@/components/schools/school-card";
import { Button } from "@/components/ui/button";
import { getFeaturedSchools, getRecentLists } from "@/lib/schools/home-queries";

const DESCRIPTION =
  "Encontre escolas de Mato Grosso por cidade, CEP ou nome, veja a lista de material escolar e resolva a compra online ou em papelarias próximas.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: "Listada Escola", description: DESCRIPTION, type: "website" },
};

// Rendered per-request (like every other data-driven page in this
// project) rather than statically generated: a static/ISR Home would run
// getFeaturedSchools()/getRecentLists() during `next build` itself,
// making a successful Vercel deployment depend on Supabase being
// reachable *at build time* -- a real, first-time failure mode this
// page introduced (every prior page's Supabase calls only ever ran at
// request time). Same PRD SEO requirement (principle 8) is met either
// way: the rendered HTML is identical, just generated per-request.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featuredSchools, recentLists] = await Promise.all([getFeaturedSchools(), getRecentLists()]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          Encontre a escola, descubra a lista.
        </h1>
        <p className="mt-3 max-w-xl text-lg text-neutral-600">
          Pesquise por CEP, cidade ou nome da escola, veja escolas de Mato Grosso e chegue até a lista escolar certa.
        </p>

        <div className="mt-8 flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <HomeLocationSearch />
          <div className="border-t border-neutral-100 pt-4">
            <HomeNameSearch />
          </div>
        </div>
      </section>

      {featuredSchools.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900">Escolas em destaque</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredSchools.map((school) => (
              <SchoolCard key={school.id} school={school} />
            ))}
          </div>
        </section>
      )}

      {recentLists.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900">Listas recentes</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentLists.map((list) => (
              <Link
                key={list.id}
                href={`/listas/${list.slug}`}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-primary-300"
              >
                <p className="font-medium text-neutral-900">
                  {list.seriesName} · {list.schoolYear}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  {list.school.name} — {list.school.municipality}, {list.school.uf}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-16 flex flex-col items-start gap-3 rounded-xl border border-dashed border-neutral-300 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ClipboardList className="mt-0.5 size-6 shrink-0 text-primary-600" aria-hidden="true" />
          <div>
            <p className="font-medium text-neutral-900">Já tem a lista escolar em mãos?</p>
            <p className="text-sm text-neutral-600">Envie a lista da sua escola e ajude outras famílias a encontrá-la.</p>
          </div>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/enviar-lista">Enviar lista</Link>
        </Button>
      </section>
    </div>
  );
}
