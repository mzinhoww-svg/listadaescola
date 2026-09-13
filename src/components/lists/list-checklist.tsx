"use client";

import * as React from "react";
import { Check, Copy, Printer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ChecklistItem {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  brand: string | null;
  is_required: boolean;
  notes: string | null;
}

export interface ListChecklistProps {
  slug: string;
  items: ChecklistItem[];
  /** Cabeçalho do texto copiado: "<série> · <ano> — <escola>". */
  copyHeading: string;
}

const storageKey = (slug: string) => `listada:checklist:${slug}`;
const CHANGE_EVENT = "listada:checklist-change";
const EMPTY: Record<string, boolean> = {};

/*
 * O progresso vive em localStorage, por lista: é conveniência do dispositivo,
 * não dado de conta -- nada disso vai para o servidor.
 *
 * Ler no `useEffect` e chamar setState seria o caminho óbvio, mas o projeto
 * proíbe (react-hooks/set-state-in-effect) e com razão: o servidor não conhece
 * o storage, então esse padrão renderiza uma vez errado e corrige depois.
 * `useSyncExternalStore` é a API feita exatamente para isto -- tem um
 * snapshot de servidor explícito e não pisca.
 *
 * O snapshot precisa ser CACHEADO: `getSnapshot` é chamado a cada render e
 * devolver um objeto novo toda vez faria o React entrar em laço infinito.
 * Só reparseia quando a string crua muda.
 */
let cachedKey: string | null = null;
let cachedRaw: string | null = null;
let cachedValue: Record<string, boolean> = EMPTY;

function readChecklist(key: string): Record<string, boolean> {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    // Aba anônima ou site data bloqueado: o acessor lança. A lista continua
    // renderizando, só sem progresso salvo.
    return EMPTY;
  }
  if (key !== cachedKey || raw !== cachedRaw) {
    cachedKey = key;
    cachedRaw = raw;
    try {
      cachedValue = raw ? (JSON.parse(raw) as Record<string, boolean>) : EMPTY;
    } catch {
      cachedValue = EMPTY;
    }
  }
  return cachedValue;
}

function writeChecklist(key: string, value: Record<string, boolean>) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // idem: não vale quebrar a tela por causa da conveniência.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function ListChecklist({ slug, items, copyHeading }: ListChecklistProps) {
  const key = storageKey(slug);
  const checked = React.useSyncExternalStore(
    subscribe,
    () => readChecklist(key),
    () => EMPTY
  );
  // Só no cliente o progresso é real; no servidor é sempre EMPTY.
  const hydrated = React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const [copied, setCopied] = React.useState(false);

  function toggle(id: string) {
    writeChecklist(key, { ...checked, [id]: !checked[id] });
  }

  const doneCount = items.filter((item) => checked[item.id]).length;
  const progress = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;
  const requiredCount = items.filter((item) => item.is_required).length;
  const optionalCount = items.length - requiredCount;

  async function copyList() {
    const lines = items.map((item) => {
      const qty = item.quantity > 1 ? `${item.quantity}x ` : "";
      const detail = [item.unit, item.brand].filter(Boolean).join(" · ");
      return `- ${qty}${item.name}${detail ? ` (${detail})` : ""}${item.is_required ? "" : " [opcional]"}`;
    });
    try {
      await navigator.clipboard.writeText(`${copyHeading}\n\n${lines.join("\n")}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem permissão de clipboard -- o botão simplesmente não confirma.
    }
  }

  return (
    <section className="mt-8">
      {/* flex-wrap: a 390px o cabeçalho quebrava em 2+2 linhas lado a lado e
          o título da seção ficava ilegível. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold text-neutral-900">Itens da lista</h2>
        <p className="text-sm text-neutral-500">
          {items.length} {items.length === 1 ? "item" : "itens"}
          {optionalCount > 0 && ` · ${requiredCount} obrigatórios, ${optionalCount} opcionais`}
        </p>
      </div>

      {/* Medidor. `hydrated` evita anunciar "0 de N" antes de ler o storage. */}
      <div className="mb-4 print:hidden" aria-live="polite">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium text-neutral-700">
            {hydrated ? `${doneCount} de ${items.length} já na sacola` : "Carregando seu progresso…"}
          </span>
          <span className="text-neutral-500">{hydrated ? `${progress}%` : ""}</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-secondary-100"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Itens marcados como comprados"
        >
          <div
            className="h-full rounded-full bg-secondary-300 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden="true" />
          Imprimir
        </Button>
        <Button variant="outline" onClick={copyList}>
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? "Copiado" : "Copiar lista"}
        </Button>
      </div>

      <ul className="flex flex-col divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {items.map((item) => {
          const isDone = Boolean(checked[item.id]);
          return (
            <li key={item.id}>
              {/* O rótulo inteiro é o alvo -- 44px de altura mínima, para uso
                  de uma mão só empurrando um carrinho. */}
              <label className="flex min-h-11 cursor-pointer items-start gap-3 p-4 hover:bg-neutral-50">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggle(item.id)}
                  className="mt-0.5 size-5 shrink-0 rounded border-neutral-300 accent-secondary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-start justify-between gap-2">
                    <span className={cn("font-medium text-neutral-900", isDone && "line-through opacity-60")}>
                      {/* A quantidade é tão decisiva quanto o nome; era
                          renderizada em neutral-500, mais clara que ele. */}
                      {item.quantity > 1 && <span className="font-medium text-neutral-900">{item.quantity}× </span>}
                      {item.name}
                    </span>
                    {/* Só a exceção precisa de marca. `is_required` é maioria
                        na prática, e o chip cinza "Obrigatório" repetido em
                        toda linha enchia a tela sem informar nada. */}
                    {!item.is_required && <Badge variant="info">Opcional</Badge>}
                  </span>
                  {(item.unit || item.brand) && (
                    <span className={cn("text-sm text-neutral-600", isDone && "opacity-60")}>
                      {[item.unit, item.brand].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {item.notes && (
                    <span className={cn("text-sm text-neutral-500", isDone && "opacity-60")}>{item.notes}</span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
