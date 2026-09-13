import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";

import { getFavoriteSchools } from "@/lib/favorites/queries";
import { schoolHref } from "@/components/schools/school-card";
import { SaveButton } from "@/components/favorites/save-button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { toDisplayCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PATH = "/minha-conta/escolas-salvas";

export const metadata: Metadata = { title: "Escolas salvas" };

export default async function EscolasSalvasPage() {
  const { schools, unavailableCount } = await getFavoriteSchools();

  return (
    <>
      <h1 className="text-2xl font-semibold text-neutral-900">Escolas salvas</h1>
      {unavailableCount > 0 && (
        <p className="mt-2 text-sm text-neutral-500">
          {unavailableCount === 1
            ? "1 escola salva não está mais disponível e foi ocultada."
            : `${unavailableCount} escolas salvas não estão mais disponíveis e foram ocultadas.`}
        </p>
      )}

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
            <Card key={school.id}>
              <CardHeader>
                <CardTitle className="line-clamp-2">
                  <Link href={schoolHref(school)} className="hover:underline">
                    {toDisplayCase(school.name)}
                  </Link>
                </CardTitle>
                <CardDescription>
                  {school.municipality}, {school.uf}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                {/* Já sabemos que está salva -- initialFavorited sempre true
                    aqui, revalida esta própria página pra sumir da lista ao
                    desfavoritar (roadmap C3: antes só dava pra desfavoritar
                    visitando a escola de novo). */}
                <SaveButton targetType="SCHOOL" targetId={school.id} isAuthenticated initialFavorited path={PATH} />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
