"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2, Plus } from "lucide-react";

import type { SchoolSearchOption } from "@/lib/contributions/actions";
import { continueLocalDraft } from "@/lib/contributions/continue-local-draft";
import { loadLocalDraft, saveLocalDraft, type LocalDraft, type LocalDraftItem } from "@/lib/contributions/local-draft";
import { WizardSteps } from "@/components/contributions/wizard-steps";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export interface AnonymousDraftMeta {
  educationLevel: string;
  seriesName: string;
  schoolYear: number;
}

interface AnonymousItemsStepProps {
  school: SchoolSearchOption;
  draftMeta: AnonymousDraftMeta;
  isAuthenticated: boolean;
  onBack: () => void;
}

function matchesDraft(draft: LocalDraft, school: SchoolSearchOption, meta: AnonymousDraftMeta): boolean {
  return (
    draft.school.id === school.id &&
    draft.educationLevel === meta.educationLevel &&
    draft.seriesName === meta.seriesName &&
    draft.schoolYear === meta.schoolYear
  );
}

/**
 * Passo "itens" do rascunho anônimo (sub-projeto papelaria #1) -- mesma
 * apresentação visual de item-form.tsx, mas escreve em localStorage em vez
 * de chamar addSubmissionItemAction/deleteSubmissionItemAction (não existe
 * submissionId ainda; só passa a existir na materialização). "Continuar"
 * decide entre materializar direto (se já autenticado, ex.: voltando do
 * login) ou mandar pra autenticação preservando o rascunho.
 */
export function AnonymousItemsStep({ school, draftMeta, isAuthenticated, onBack }: AnonymousItemsStepProps) {
  const router = useRouter();
  const [items, setItems] = React.useState<LocalDraftItem[]>(() => {
    const existing = loadLocalDraft();
    return existing && matchesDraft(existing, school, draftMeta) ? existing.items : [];
  });
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    saveLocalDraft({ school, ...draftMeta, items, savedAt: new Date().toISOString() });
    // school/draftMeta são estáveis por identidade de instância enquanto
    // este step está montado -- só mudam via onBack, que desmonta este
    // componente e volta pro passo anterior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function handleAddItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const quantity = Number(formData.get("quantity"));
    const unit = String(formData.get("unit") ?? "").trim();
    const brand = String(formData.get("brand") ?? "").trim();
    const isRequired = formData.get("is_required") === "on";

    if (!name || !Number.isInteger(quantity) || quantity < 1 || quantity > 9999) return;

    setItems((current) => [
      ...current,
      { id: crypto.randomUUID(), name, quantity, unit: unit || null, brand: brand || null, isRequired },
    ]);
    formRef.current?.reset();
  }

  function handleRemoveItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function handleContinue() {
    setError(null);
    const draft: LocalDraft = { school, ...draftMeta, items, savedAt: new Date().toISOString() };

    if (!isAuthenticated) {
      saveLocalDraft(draft);
      router.push("/auth/entrar?next=%2F");
      return;
    }

    setPending(true);
    const result = await continueLocalDraft(draft, router);
    setPending(false);
    if (!result.ok) setError(result.error ?? "Não foi possível continuar. Tente novamente.");
  }

  return (
    <>
      <WizardSteps current="itens" />
      <Card>
        <CardHeader>
          <button
            type="button"
            onClick={onBack}
            className="flex w-fit items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Trocar série/ano
          </button>
          <CardTitle>{school.name}</CardTitle>
          <CardDescription>
            {draftMeta.educationLevel} · {draftMeta.seriesName} · {draftMeta.schoolYear}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            ref={formRef}
            onSubmit={handleAddItem}
            noValidate
            className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4"
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input label="Item" name="name" placeholder="Ex.: Caderno brochura 96 folhas" required />
              <div className="w-full sm:w-24">
                <Input label="Qtd." name="quantity" type="number" min={1} max={9999} defaultValue={1} required />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Unidade (opcional)" name="unit" placeholder="Ex.: unidade, pacote" />
              <Input label="Marca (opcional)" name="brand" placeholder="Ex.: Tilibra" />
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                name="is_required"
                defaultChecked
                className="size-4 rounded border-neutral-300 accent-primary-600 text-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              />
              Item obrigatório
            </label>
            <div className="flex justify-end">
              <Button type="submit" variant="outline">
                <Plus className="size-4" aria-hidden="true" />
                Adicionar item
              </Button>
            </div>
          </form>

          <h2 className="text-base font-semibold text-neutral-900">Itens ({items.length})</h2>
          {items.length === 0 ? (
            <EmptyState title="Nenhum item ainda" description="Adicione os itens da lista escolar acima." />
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-neutral-900">
                      {item.quantity}x {item.name}
                      {item.unit ? ` (${item.unit})` : ""}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                      {item.brand && <span>{item.brand}</span>}
                      {!item.isRequired && <Badge variant="neutral">opcional</Badge>}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remover item"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <Trash2 className="size-4 text-danger-600" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p role="alert" className="text-sm text-danger-600">
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="button" onClick={handleContinue} disabled={items.length === 0 || pending} loading={pending}>
              Continuar
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
