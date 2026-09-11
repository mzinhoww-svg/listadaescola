import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";

import { getActiveStores, storeHref } from "@/lib/stores/store-profile";
import { EmptyState } from "@/components/ui/empty-state";

// Same reasoning as every other Supabase-backed public page: never
// statically prerendered.
export const dynamic = "force-dynamic";

// Escopo inicial do PRD é só MT -- ver CLAUDE.md.
const UF = "MT";

export const metadata: Metadata = {
  title: "Papelarias",
  description: `Papelarias ativas em ${UF} para comprar material escolar local, com pedido de orçamento pelo WhatsApp.`,
  alternates: { canonical: "/papelarias" },
  openGraph: { title: "Papelarias", description: `Papelarias ativas em ${UF}.`, type: "website" },
};

export default async function PapelariasPage() {
  const stores = await getActiveStores(UF);
  const byMunicipality = new Map<string, typeof stores>();
  for (const store of stores) {
    const group = byMunicipality.get(store.municipality) ?? [];
    group.push(store);
    byMunicipality.set(store.municipality, group);
  }
  const municipalities = [...byMunicipality.keys()].sort();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">Papelarias</h1>
      <p className="mb-6 max-w-2xl text-neutral-600">
        {stores.length} papelarias ativas em {UF}. Peça orçamento direto pelo WhatsApp.
      </p>

      {stores.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Nenhuma papelaria cadastrada ainda"
          description="Assim que uma papelaria for cadastrada, ela aparece aqui."
        />
      ) : (
        <div className="flex flex-col gap-8">
          {municipalities.map((municipality) => (
            <section key={municipality}>
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">{municipality}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {byMunicipality.get(municipality)!.map((store) => (
                  <Link
                    key={store.id}
                    href={storeHref(store)}
                    className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-primary-300"
                  >
                    <p className="font-medium text-neutral-900">{store.name}</p>
                    {store.address && <p className="mt-1 text-sm text-neutral-500">{store.address}</p>}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
