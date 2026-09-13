import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark } from "lucide-react";

import { getFavoriteLists } from "@/lib/favorites/queries";
import { SaveButton } from "@/components/favorites/save-button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const PATH = "/minha-conta/listas-salvas";

export const metadata: Metadata = { title: "Listas salvas" };

export default async function ListasSalvasPage() {
  const { lists, unavailableCount } = await getFavoriteLists();

  return (
    <>
      <h1 className="text-2xl font-semibold text-neutral-900">Listas salvas</h1>
      {unavailableCount > 0 && (
        <p className="mt-2 text-sm text-neutral-500">
          {unavailableCount === 1
            ? "1 lista salva não está mais disponível e foi ocultada."
            : `${unavailableCount} listas salvas não estão mais disponíveis e foram ocultadas.`}
        </p>
      )}

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
            <Card key={list.id}>
              <CardHeader>
                <CardTitle className="line-clamp-2">
                  <Link href={`/listas/${list.slug}`} className="hover:underline">
                    {list.seriesName} · {list.schoolYear}
                  </Link>
                </CardTitle>
                <CardDescription>
                  {list.school.name} — {list.school.municipality}, {list.school.uf}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <SaveButton targetType="LIST" targetId={list.id} isAuthenticated initialFavorited path={PATH} />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
