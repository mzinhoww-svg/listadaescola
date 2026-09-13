import Link from "next/link";
import { ListChecks, MapPin, School } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CoverageSummary } from "@/lib/schools/coverage";

const numberFormat = new Intl.NumberFormat("pt-BR");

/**
 * Em mobile os três números viram três linhas de um painel só, separadas
 * por pauta (rótulo à esquerda, número à direita) -- três cartões
 * empilhados custavam ~300px de rolagem para dizer três coisas curtas. Em
 * telas maiores viram três colunas com o número embaixo do rótulo.
 */
function Stat({ icon: Icon, value, label }: { icon: typeof School; value: string; label: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 p-4 sm:flex-col sm:items-start sm:gap-1">
      <dt className="flex items-center gap-1.5 text-sm text-neutral-600">
        <Icon className="size-4 shrink-0 text-primary-600" aria-hidden="true" />
        {label}
      </dt>
      <dd className="font-display text-2xl font-semibold tracking-tight text-neutral-900">{value}</dd>
    </div>
  );
}

/**
 * Onda 3 -- a seção que substitui "Escolas em destaque".
 *
 * "Escolas em destaque" era condicional e voltava sempre vazia:
 * `getFeaturedSchools()` só considera escola patrocinada ou verificada por
 * admin, e não existe nenhuma das duas coisas ainda. A régua está certa e
 * não foi afrouxada -- montar "destaques" a partir de uma amostra
 * arbitrária das 2.722 escolas seria inventar curadoria. O que sobrava era
 * um salto de 4rem e uma home que terminava sem dizer nada.
 *
 * No lugar, o que o produto realmente tem: cobertura. Todo número aqui vem
 * de query (`getCoverageSummary`), nenhum é constante escrita à mão.
 *
 * Incluindo o zero. Enquanto não houver lista publicada, a seção diz isso
 * em texto, com a saída correspondente, em vez de esconder a linha ou
 * maquiar a contagem com a fixture de QA. Quando a primeira lista real
 * sair, as cidades aparecem sozinhas -- sem ninguém editar copy.
 */
export function CoverageSection({ coverage }: { coverage: CoverageSummary }) {
  const { uf, schoolCount, municipalityCount, municipalitiesWithList } = coverage;
  const hasCoveredCities = municipalitiesWithList.length > 0;

  return (
    <section className="mt-12" aria-labelledby="cobertura-titulo">
      <h2 id="cobertura-titulo" className="text-xl font-semibold text-neutral-900">
        O que já está mapeado em {uf}
      </h2>
      <p className="mt-1 mb-4 max-w-[65ch] text-sm text-neutral-600">
        A base de escolas vem do Censo Escolar do INEP. As listas de material vêm das famílias e das escolas — por isso
        a cobertura de listas cresce devagar, e a gente prefere mostrar o número real.
      </p>

      <dl className="grid grid-cols-1 divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-paper shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Stat icon={School} value={numberFormat.format(schoolCount)} label="Escolas mapeadas" />
        <Stat icon={MapPin} value={numberFormat.format(municipalityCount)} label={`Cidades de ${uf}`} />
        <Stat
          icon={ListChecks}
          value={numberFormat.format(municipalitiesWithList.length)}
          label="Cidades com lista publicada"
        />
      </dl>

      {hasCoveredCities ? (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-medium text-neutral-900">Cidades que já têm lista</h3>
          <ul className="flex flex-wrap gap-2">
            {municipalitiesWithList.map((municipality) => (
              <li key={municipality.name}>
                <Link
                  href={`/escolas?uf=${uf}&municipality=${encodeURIComponent(municipality.name)}&lista=com`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-neutral-200 bg-paper px-3 text-sm font-medium text-neutral-900 transition-colors hover:border-primary-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                >
                  {municipality.name}
                  <span className="text-neutral-500">
                    {municipality.listCount} {municipality.listCount === 1 ? "lista" : "listas"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-dashed border-neutral-300 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[65ch] text-sm text-neutral-700">
            <span className="font-medium text-neutral-900">Nenhuma lista publicada ainda.</span> Busque a sua escola
            aqui em cima e peça o aviso — assim você fica sabendo no dia em que ela sair.
          </p>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/escolas">Ver as escolas</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
