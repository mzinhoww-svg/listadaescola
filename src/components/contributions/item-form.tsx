"use client";

import * as React from "react";
import { useActionState } from "react";
import { Trash2, Plus } from "lucide-react";

import {
  addSubmissionItemAction,
  deleteSubmissionItemAction,
  type FormState,
} from "@/lib/contributions/actions";
import type { Database } from "@/lib/supabase/database.types";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

type SubmissionItem = Database["public"]["Tables"]["submission_items"]["Row"];

const initialState: FormState = {};

export function AddItemForm({ submissionId }: { submissionId: string }) {
  const [state, formAction] = useActionState(addSubmissionItemAction, initialState);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4">
      <input type="hidden" name="submission_id" value={submissionId} />
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
      <Input label="Observação (opcional)" name="notes" placeholder="Ex.: capa dura, sem pauta" />
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          name="is_required"
          defaultChecked
          className="size-4 rounded border-neutral-300 text-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        />
        Item obrigatório
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      <div className="flex justify-end">
        <SubmitButton variant="outline">
          <Plus className="size-4" aria-hidden="true" />
          Adicionar item
        </SubmitButton>
      </div>
    </form>
  );
}

function DeleteItemButton({ submissionId, itemId }: { submissionId: string; itemId: string }) {
  const [, formAction] = useActionState(deleteSubmissionItemAction, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="submission_id" value={submissionId} />
      <input type="hidden" name="item_id" value={itemId} />
      <SubmitButton variant="ghost" size="icon" aria-label="Remover item">
        <Trash2 className="size-4 text-danger-600" aria-hidden="true" />
      </SubmitButton>
    </form>
  );
}

export function ItemsList({ submissionId, items }: { submissionId: string; items: SubmissionItem[] }) {
  if (items.length === 0) {
    return <EmptyState title="Nenhum item ainda" description="Adicione os itens da lista escolar acima." />;
  }

  return (
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
              {item.notes && <span>· {item.notes}</span>}
              {!item.is_required && <Badge variant="neutral">opcional</Badge>}
            </span>
          </div>
          <DeleteItemButton submissionId={submissionId} itemId={item.id} />
        </li>
      ))}
    </ul>
  );
}
