"use client";

import * as React from "react";
import { Check, MessageCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NearbyStore } from "@/lib/stores/nearby-stores";
import { buildStoreQuoteHref } from "@/lib/stores/quote-link";
import { recordQuoteComparisonStartedAction } from "@/lib/stores/compare-actions";

export interface CompareQuotesPanelProps {
  /** Already in `nearby_stores()` order -- proximity group, distance, name.
   * Never re-sorted here: that ordering is the papelaria ranking rule. */
  stores: NearbyStore[];
  schoolId: string;
  listId: string;
  onExit: () => void;
}

/** Below this there is nothing to compare -- one orçamento is just the
 * normal WhatsApp CTA, which the store cards already offer. */
export const MIN_STORES_TO_COMPARE = 2;

/**
 * Pedir o MESMO orçamento a várias papelarias, uma conversa de cada vez.
 *
 * É como uma família de verdade resolve lista escolar no Brasil: manda a
 * lista para duas ou três papelarias e compara o que voltar. O produto
 * fazia isso ficar caro (reabrir a gaveta, achar a loja, clicar, voltar);
 * aqui vira uma fila explícita, com a mesma mensagem itemizada que
 * `/api/store/whatsapp` já monta.
 *
 * Continua sendo só link + tracking, e continua sem pagamento de
 * qualquer espécie: o orçamento é uma conversa no WhatsApp da loja, não
 * um pedido, uma reserva ou um checkout. Cada botão é um `<a>` de
 * verdade para o mesmo endpoint rastreado de sempre -- um clique real do
 * usuário por loja, o que também é a única forma de não esbarrar no
 * bloqueio de popup do navegador ao tentar abrir várias abas de uma vez.
 */
export function CompareQuotesPanel({ stores, schoolId, listId, onExit }: CompareQuotesPanelProps) {
  const reachable = React.useMemo(() => stores.filter((store) => store.whatsappNormalized !== null), [stores]);
  const [step, setStep] = React.useState<"select" | "send">("select");
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => reachable.slice(0, 3).map((s) => s.id));
  const [openedIds, setOpenedIds] = React.useState<string[]>([]);

  const selected = reachable.filter((store) => selectedIds.includes(store.id));

  function toggle(storeId: string) {
    setSelectedIds((current) =>
      current.includes(storeId) ? current.filter((id) => id !== storeId) : [...current, storeId]
    );
  }

  function confirmSelection() {
    setOpenedIds([]);
    setStep("send");
    // Best-effort (RF-015), same rule as every other event in this codebase:
    // never blocks or breaks the interaction it measures.
    void recordQuoteComparisonStartedAction({ schoolId, listId, storeIds: selectedIds });
  }

  if (step === "select") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-600">
          Escolha as papelarias que você quer consultar. Cada uma recebe a <strong>mesma lista</strong>, já escrita na
          conversa — você abre uma de cada vez e decide se envia.
        </p>

        <ul className="flex flex-col divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {reachable.map((store) => (
            <li key={store.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(store.id)}
                  onChange={() => toggle(store.id)}
                  className="size-5 shrink-0 accent-primary-600"
                />
                <span className="min-w-0 flex-1 text-sm text-neutral-900">{store.name}</span>
                {store.distanceKm !== null && (
                  <Badge variant="neutral" className="shrink-0">
                    {store.distanceKm} km
                  </Badge>
                )}
              </label>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={confirmSelection} disabled={selectedIds.length < MIN_STORES_TO_COMPARE}>
            <MessageCircle className="size-4" aria-hidden="true" />
            {selectedIds.length < MIN_STORES_TO_COMPARE
              ? "Selecione ao menos 2 papelarias"
              : `Pedir orçamento a ${selectedIds.length} papelarias`}
          </Button>
          <Button variant="ghost" onClick={onExit}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600">
        Abra uma conversa de cada vez. O WhatsApp abre com a lista já escrita —{" "}
        <strong>quem envia é você</strong>, e o Listada não participa da negociação nem do pagamento.
      </p>

      <p className="text-sm font-medium text-neutral-700" aria-live="polite">
        {openedIds.length} de {selected.length} conversas abertas
      </p>

      <ol className="flex flex-col divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {selected.map((store, index) => {
          const opened = openedIds.includes(store.id);
          return (
            <li key={store.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3">
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-xs font-medium text-secondary-700"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 text-sm text-neutral-900">
                {store.name}
                {opened && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-neutral-500">
                    <Check className="size-3" aria-hidden="true" />
                    aberta
                  </span>
                )}
              </span>
              <Button asChild variant={opened ? "outline" : "whatsapp"} size="sm" className="w-full sm:w-auto">
                <a
                  href={buildStoreQuoteHref({ storeId: store.id, schoolId, listId })}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  onClick={() => setOpenedIds((current) => (current.includes(store.id) ? current : [...current, store.id]))}
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  {opened ? "Abrir de novo" : "Abrir WhatsApp"}
                </a>
              </Button>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={() => setStep("select")}>
          Escolher outras papelarias
        </Button>
        <Button variant="ghost" onClick={onExit}>
          Voltar para a lista de papelarias
        </Button>
      </div>
    </div>
  );
}
