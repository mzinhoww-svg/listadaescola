"use client";

import * as React from "react";
import { useActionState } from "react";

import { publishManagedSchoolListAction, type FormState } from "@/lib/schools/manager-actions";
import { parseListItems } from "@/lib/admin/parse-list-items";
import { EDUCATION_LEVELS } from "@/lib/schools/search-schools";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const YEARS = [new Date().getFullYear(), new Date().getFullYear() + 1];

interface SchoolIdentity {
  id: string;
  slug: string;
  uf: string;
  municipalitySlug: string;
}

/**
 * Onda 7 -- a mesma mecânica de colagem + prévia do formulário do admin
 * (src/components/admin/publish-list-form.tsx), sem o passo de escolher a
 * escola: aqui a escola é a do gestor, e ele não pode publicar em outra
 * (o gate está em `school_manager_publish_list`, não no formulário).
 *
 * A prévia antes de publicar é a peça que importa: a escola cola a lista
 * como ela existe (WhatsApp, PDF, papel transcrito) e confere o que o
 * parser entendeu ANTES de qualquer coisa ir ao ar para as famílias.
 */
export function PublishSchoolListForm({ school }: { school: SchoolIdentity }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(publishManagedSchoolListAction, {});
  const [itemsText, setItemsText] = React.useState("");

  // Recalculado a cada tecla. Barato: é string pura, sem ida ao servidor.
  const preview = React.useMemo(() => parseListItems(itemsText), [itemsText]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="school_id" value={school.id} />
      <input type="hidden" name="school_slug" value={school.slug} />
      <input type="hidden" name="school_uf" value={school.uf.toLowerCase()} />
      <input type="hidden" name="school_municipality_slug" value={school.municipalitySlug} />

      {state.error && (
        <p role="alert" className="rounded-lg border border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-lg border border-success-500 bg-success-50 px-4 py-3 text-sm text-success-700">
          {state.success}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Etapa" name="education_level" defaultValue={EDUCATION_LEVELS[1]} required>
          {EDUCATION_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </Select>
        <Input label="Série / ano" name="series_name" placeholder="3º ano" required />
        <Select label="Ano letivo" name="school_year" defaultValue={String(YEARS[1])} required>
          {YEARS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="items_text" className="text-sm font-medium text-neutral-900">
          Cole a lista, um item por linha
        </label>
        <textarea
          id="items_text"
          name="items_text"
          value={itemsText}
          onChange={(event) => setItemsText(event.target.value)}
          rows={10}
          required
          placeholder={"2 cadernos brochura 96 folhas\n1 caixa de lápis de cor\n1 tesoura sem ponta (opcional)"}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        />
        <p className="max-w-[65ch] text-sm text-neutral-600">
          Quantidade no começo da linha e &quot;(opcional)&quot; são reconhecidos automaticamente. Confira o
          resultado abaixo antes de publicar. Publicar de novo a mesma série e ano não sobrescreve: cria uma
          versão nova e mantém o histórico.
        </p>
      </div>

      {preview.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-neutral-900">
            Prévia — {preview.length} {preview.length === 1 ? "item" : "itens"}
          </h3>
          <ul className="flex flex-col divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
            {preview.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className="min-w-10 font-medium text-neutral-900">{item.quantity}×</span>
                <span className="flex-1 text-neutral-900">{item.name}</span>
                {item.unit && <span className="text-sm text-neutral-600">{item.unit}</span>}
                {!item.is_required && <Badge variant="info">Opcional</Badge>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div>
        <Button type="submit" size="lg" loading={pending} disabled={preview.length === 0}>
          Publicar lista
        </Button>
      </div>
    </form>
  );
}
