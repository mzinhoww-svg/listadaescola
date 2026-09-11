import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { getPublicLists } from "@/lib/lists/list-detail";
import { PaginationControls } from "@/components/schools/pagination-controls";
import { EmptyState } from "@/components/ui/empty-state";

// Same reasoning as every other Supabase-backed public page: never
// statically prerendered.
export const dynamic = "force-dynamic";

interface ListasPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export const metadata: Metadata = {
  title: "Listas escolares",
  description: "Listas de material escolar publicadas para escolas de Mato Grosso.",
  alternates: { canonical: "/listas" },
  openGraph: { title: "Listas escolares", description: "Listas de material escolar publicadas.", type: "website" },
};

export default async function ListasPage({ searchParams }: ListasPageProps) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;
  const result = await getPublicLists(Number.isFinite(page) ? page : 1);
  const linkParams = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">Listas escolares</h1>
      <p className="mb-6 max-w-2xl text-neutral-600">{result.total} listas publicadas em Mato Grosso.</p>

      {result.items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma lista publicada ainda"
          description="Assim que uma lista for aprovada e publicada, ela aparece aqui."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {result.items.map((list) => (
              <Link
                key={list.id}
                href={`/listas/${list.slug}`}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-primary-300"
              >
                <p className="font-medium text-neutral-900">
                  {list.seriesName} · {list.schoolYear}
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  {list.school.name} — {list.school.municipality}, {list.school.uf}
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-6">
            <PaginationControls page={result.page} pageCount={result.pageCount} searchParams={linkParams} basePath="/listas" />
          </div>
        </>
      )}
    </div>
  );
}
