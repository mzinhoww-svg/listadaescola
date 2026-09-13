import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { CoverageSection } from "@/components/home/coverage-section";
import { HomeSearch } from "@/components/home/home-search";
import { Button } from "@/components/ui/button";
import { getCoverageSummary } from "@/lib/schools/coverage";
import { getRecentLists } from "@/lib/schools/home-queries";
import { toDisplayCase } from "@/lib/utils";

const DESCRIPTION =
  "Encontre escolas de Mato Grosso por cidade, CEP ou nome, veja a lista de material escolar e resolva a compra online ou em papelarias próximas.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: "Listada Escola", description: DESCRIPTION, type: "website" },
};

// Rendered per-request (like every other data-driven page in this
// project) rather than statically generated: a static/ISR Home would run
// its Supabase queries during `next build` itself, making a successful
// Vercel deployment depend on Supabase being reachable *at build time* --
// a real, first-time failure mode this page introduced (every prior
// page's Supabase calls only ever ran at request time). Same PRD SEO
// requirement (principle 8) is met either way: the rendered HTML is
// identical, just generated per-request.
export const dynamic = "force-dynamic";

/**
 * Onda 3 -- a home vira captura de intenção.
 *
 * Duas mudanças estruturais, ambas motivadas pelo mesmo fato medido: há
 * 2.722 escolas reais em MT e nenhuma lista real publicada.
 *
 * 1. Um campo de busca só (`HomeSearch`), no lugar dos dois caminhos
 *    concorrentes que exigiam classificar a entrada antes de digitar. Nome
 *    de escola responde na própria home, porque é ali que a resposta "essa
 *    escola ainda não tem lista" precisa oferecer uma saída -- "avise-me
 *    quando publicarem", só e-mail, sem conta.
 * 2. "Escolas em destaque" (sempre vazia, ver CoverageSection) dá lugar à
 *    cobertura real, com números vindos de query. "Listas recentes" fica
 *    como estava, condicional: hoje não renderiza, e quando houver lista
 *    ela volta sozinha -- o que está correto.
 */
export default async function HomePage() {
  const [coverage, recentLists] = await Promise.all([getCoverageSummary(), getRecentLists()]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          Encontre a escola, descubra a lista.
        </h1>
        <p className="mt-3 max-w-[65ch] text-lg text-neutral-600">
          Busque por CEP, cidade ou nome da escola. Se a lista ainda não tiver sido publicada, a gente avisa você
          quando sair.
        </p>

        <div className="mt-8 rounded-xl border border-neutral-200 bg-paper p-5 shadow-sm">
          <HomeSearch />
        </div>
      </section>

      <CoverageSection coverage={coverage} />

      {recentLists.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900">Listas recentes</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,320px))] gap-4">
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
                  {toDisplayCase(list.school.name)} — {list.school.municipality}, {list.school.uf}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 flex flex-col items-start gap-3 rounded-xl border border-dashed border-neutral-300 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ClipboardList className="mt-0.5 size-6 shrink-0 text-primary-600" aria-hidden="true" />
          <div>
            <p className="font-medium text-neutral-900">Já tem a lista escolar em mãos?</p>
            <p className="max-w-[65ch] text-sm text-neutral-600">
              Envie a lista da sua escola e ajude outras famílias a encontrá-la.
            </p>
          </div>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/enviar-lista">Enviar lista</Link>
        </Button>
      </section>
    </div>
  );
}
