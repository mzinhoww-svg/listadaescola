import Link from "next/link";
import { ListChecks, MapPin } from "lucide-react";

import { slugify } from "@/lib/utils";

/**
 * Onda 2 P2. O que /escolas mostra quando ainda não há escopo nenhum --
 * nem localização, nem busca, nem filtro.
 *
 * Antes, esse estado renderizava as 2.722 escolas de MT em ordem
 * alfabética: página 1 de 137, começando por uma sequência de APAEs de
 * municípios diferentes. Para quem chega pelo header ou por SEO era o
 * primeiro contato com o produto, e não respondia nenhuma pergunta que uma
 * mãe tenha. O `LocationBanner` acima já abre em modo de escolha; isto dá o
 * resto da tela para a mesma decisão, com atalho para onde estão as escolas.
 *
 * As cidades são fixas de propósito: são as 8 maiores de MT por número de
 * escolas ativas, e virar uma query por município a cada render do estado
 * vazio custaria mais do que vale.
 */
const MAIN_MUNICIPALITIES = [
  { name: "Cuiabá", schools: 384 },
  { name: "Várzea Grande", schools: 174 },
  { name: "Rondonópolis", schools: 160 },
  { name: "Sinop", schools: 89 },
  { name: "Tangará da Serra", schools: 72 },
  { name: "Cáceres", schools: 66 },
  { name: "Barra do Garças", schools: 59 },
  { name: "Sorriso", schools: 56 },
];

export function CatalogLanding({ uf }: { uf: string }) {
  const ufSlug = uf.toLowerCase();

  return (
    <div className="mt-6 flex flex-col gap-6">
      <section>
        <h2 className="mb-1 text-lg font-semibold text-neutral-900">Comece pela cidade</h2>
        <p className="mb-4 max-w-[65ch] text-sm text-neutral-600">
          Informe sua localização acima, ou escolha uma das maiores cidades de {uf}.
        </p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {MAIN_MUNICIPALITIES.map((municipality) => (
            <li key={municipality.name}>
              <Link
                href={`/escolas/${ufSlug}/${slugify(municipality.name)}`}
                className="flex h-full min-h-11 flex-col justify-center rounded-xl border border-neutral-200 bg-white px-4 py-3 transition-colors hover:border-primary-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                <span className="flex items-center gap-1.5 font-medium text-neutral-900">
                  <MapPin className="size-4 shrink-0 text-primary-600" aria-hidden="true" />
                  {municipality.name}
                </span>
                <span className="mt-0.5 text-sm text-neutral-500">{municipality.schools} escolas</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-neutral-300 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ListChecks className="mt-0.5 size-6 shrink-0 text-primary-600" aria-hidden="true" />
          <div>
            <p className="font-medium text-neutral-900">Procurando uma lista de material?</p>
            <p className="max-w-[65ch] text-sm text-neutral-600">
              Veja apenas as escolas que já têm lista publicada.
            </p>
          </div>
        </div>
        <Link
          href={`/escolas?uf=${uf}&lista=com`}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-neutral-300 px-4 font-medium text-neutral-900 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 sm:w-auto"
        >
          Ver escolas com lista
        </Link>
      </section>
    </div>
  );
}
