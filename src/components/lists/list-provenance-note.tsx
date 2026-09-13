import { CalendarClock, School, ShieldCheck, Users, type LucideIcon } from "lucide-react";

import { LIST_PROVENANCE_COPY, type ListProvenance } from "@/lib/lists/provenance";

const PROVENANCE_ICON: Record<ListProvenance, LucideIcon> = {
  SCHOOL: School,
  TEAM: ShieldCheck,
  COMMUNITY: Users,
};

export interface ListProvenanceNoteProps {
  provenance: ListProvenance | null;
  publishedAt: string;
  versionNumber: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

/**
 * Onda 9 -- procedência da lista, na tela onde a decisão de gastar dinheiro
 * é tomada.
 *
 * Duas coisas que já existiam e nenhuma tela mostrava: `publishedAt` e
 * `versionNumber` vinham de getListBySlug() desde o Prompt 07 e morriam ali.
 * Uma lista de material tem validade prática -- a de 2025 não serve para
 * 2026 -- e o ano letivo sozinho não diz quando aquele conteúdo foi
 * conferido pela última vez.
 *
 * A terceira é nova: quem publicou. São três origens com graus de confiança
 * honestamente diferentes, e a diferença é dita em vez de nivelada. A
 * contribuição da comunidade é a única que ganha uma ressalva explícita
 * ("vale conferir com a escola") -- não porque seja ruim, mas porque é a
 * única em que ninguém com vínculo com a escola esteve no caminho.
 *
 * Procedência desconhecida (`null`) não vira rótulo: mostra só data e
 * versão. Rotular por padrão a origem mais lisonjeira seria fabricar
 * procedência.
 */
export function ListProvenanceNote({ provenance, publishedAt, versionNumber }: ListProvenanceNoteProps) {
  const copy = provenance ? LIST_PROVENANCE_COPY[provenance] : null;
  const Icon = provenance ? PROVENANCE_ICON[provenance] : CalendarClock;

  return (
    <section aria-label="Procedência da lista" className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
      <p className="flex items-start gap-2 text-sm font-medium text-neutral-900">
        <Icon className="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden="true" />
        <span>{copy ? copy.label : "Lista publicada"}</span>
      </p>
      {copy && <p className="mt-1.5 max-w-[65ch] pl-6 text-sm text-neutral-600">{copy.description}</p>}
      <p className="mt-1.5 pl-6 text-sm text-neutral-500">
        Publicada em {formatDate(publishedAt)}
        {versionNumber > 1 && ` · ${versionNumber}ª versão desta lista`}
      </p>
    </section>
  );
}
