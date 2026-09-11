import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";

import { getFavoriteSchools } from "@/lib/favorites/queries";
import { schoolHref } from "@/components/schools/school-card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Escolas salvas" };

export default async function EscolasSalvasPage() {
  const schools = await getFavoriteSchools();

  return (
    <>
      <h1 className="text-2xl font-semibold text-neutral-900">Escolas salvas</h1>

      {schools.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nenhuma escola salva"
          description="Favorite uma escola para encontrá-la rapidamente aqui depois."
          className="mt-6"
        />
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {schools.map((school) => (
            <Link
              key={school.id}
              href={schoolHref(school)}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-primary-300"
            >
              <p className="font-medium text-neutral-900">{school.name}</p>
              <p className="mt-1 text-sm text-neutral-600">
                {school.municipality}, {school.uf}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
