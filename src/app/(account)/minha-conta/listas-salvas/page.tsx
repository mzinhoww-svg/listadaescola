import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark } from "lucide-react";

import { getFavoriteLists } from "@/lib/favorites/queries";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Listas salvas" };

export default async function ListasSalvasPage() {
  const lists = await getFavoriteLists();

  return (
    <>
      <h1 className="text-2xl font-semibold text-neutral-900">Listas salvas</h1>

      {lists.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nenhuma lista salva"
          description="Favorite uma lista para encontrá-la rapidamente aqui depois."
          className="mt-6"
        />
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {lists.map((list) => (
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
      )}
    </>
  );
}
