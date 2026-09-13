"use client";

import { useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  addManagedSchoolContactAction,
  removeManagedSchoolContactAction,
  MANAGER_CONTACT_TYPES,
  type FormState,
} from "@/lib/schools/manager-actions";
import type { ManagedSchoolContact } from "@/lib/schools/manager";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/auth/submit-button";
import { contactTypeLabel } from "@/lib/schools/format";

const initialState: FormState = {};

interface SchoolIdentity {
  id: string;
  slug: string;
  uf: string;
  municipalitySlug: string;
}

function HiddenSchoolFields({ school }: { school: SchoolIdentity }) {
  return (
    <>
      <input type="hidden" name="school_id" value={school.id} />
      <input type="hidden" name="school_slug" value={school.slug} />
      <input type="hidden" name="school_uf" value={school.uf.toLowerCase()} />
      <input type="hidden" name="school_municipality_slug" value={school.municipalitySlug} />
    </>
  );
}

function RemoveContactForm({ school, contactId }: { school: SchoolIdentity; contactId: string }) {
  const [state, formAction] = useActionState(removeManagedSchoolContactAction, initialState);
  return (
    <form action={formAction}>
      <HiddenSchoolFields school={school} />
      <input type="hidden" name="contact_id" value={contactId} />
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      <SubmitButton variant="ghost" size="icon" aria-label="Remover contato">
        <Trash2 className="size-4" aria-hidden="true" />
      </SubmitButton>
    </form>
  );
}

/**
 * Onda 7. Antes desta onda o gestor tinha INSERT e UPDATE em
 * `school_contacts` mas nem SELECT do que não fosse público nem DELETE --
 * dava para cadastrar um telefone errado e nunca mais tirar. As duas
 * policies novas (`school_contacts_manager_select` / `_delete`) são o que
 * torna esta tela possível.
 */
export function SchoolContactsManager({
  school,
  contacts,
}: {
  school: SchoolIdentity;
  contacts: ManagedSchoolContact[];
}) {
  const [state, formAction] = useActionState(addManagedSchoolContactAction, initialState);

  return (
    <div className="flex flex-col gap-4">
      {contacts.length > 0 ? (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-xl border border-neutral-200">
          {contacts.map((contact) => (
            <li key={contact.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-neutral-500">{contactTypeLabel(contact.contactType)}</span>
                <span className="font-medium text-neutral-900">{contact.value}</span>
                {!contact.isPublic && <Badge variant="neutral">Interno</Badge>}
              </span>
              <RemoveContactForm school={school} contactId={contact.id} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-600">Nenhum contato cadastrado além dos dados oficiais do INEP.</p>
      )}

      <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-dashed border-neutral-300 p-3">
        <HiddenSchoolFields school={school} />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
          <Select label="Tipo" name="contact_type" defaultValue="PHONE" required>
            {MANAGER_CONTACT_TYPES.map((type) => (
              <option key={type} value={type}>
                {contactTypeLabel(type)}
              </option>
            ))}
          </Select>
          <Input label="Contato" name="value" placeholder="(65) 3333-0000" required />
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            name="is_public"
            defaultChecked
            className="size-4 rounded border-neutral-300 accent-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          />
          Mostrar no perfil público
        </label>
        {state?.error && (
          <p role="alert" className="text-sm text-danger-600">
            {state.error}
          </p>
        )}
        {state?.success && (
          <p role="status" className="text-sm text-success-600">
            {state.success}
          </p>
        )}
        <div className="flex justify-end">
          <SubmitButton variant="outline">
            <Plus className="size-4" aria-hidden="true" />
            Adicionar contato
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
