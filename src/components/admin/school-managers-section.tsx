"use client";

import { useActionState, useEffect } from "react";
import { UserMinus } from "lucide-react";

import {
  assignSchoolManagerAction,
  removeSchoolManagerAction,
  type FormState,
} from "@/lib/admin/school-manager-actions";
import type { SchoolManagerRow } from "@/lib/admin/school-managers";
import type { AdminUserRow } from "@/lib/admin/users";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/use-toast";

const initialState: FormState = {};

function AssignManagerForm({ schoolId, candidates }: { schoolId: string; candidates: AdminUserRow[] }) {
  const [state, formAction] = useActionState(assignSchoolManagerAction, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.success) toast({ title: state.success, variant: "success" });
    if (state?.error) toast({ title: state.error, variant: "danger" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (candidates.length === 0) {
    return <p className="text-sm text-neutral-500">Nenhum usuário disponível para atribuir.</p>;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="school_id" value={schoolId} />
      <div className="min-w-48 flex-1">
        <Select label="Atribuir gestor" name="profile_id" required defaultValue="" hideLabel>
          <option value="" disabled>
            Selecione uma pessoa
          </option>
          {candidates.map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullName ?? "(sem nome)"}
            </option>
          ))}
        </Select>
      </div>
      <SubmitButton size="sm">Atribuir</SubmitButton>
    </form>
  );
}

function RemoveManagerButton({ schoolId, managerId }: { schoolId: string; managerId: string }) {
  const [state, formAction] = useActionState(removeSchoolManagerAction, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.success) toast({ title: state.success, variant: "success" });
    if (state?.error) toast({ title: state.error, variant: "danger" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!confirm("Remover este gestor desta escola?")) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={managerId} />
      <input type="hidden" name="school_id" value={schoolId} />
      <SubmitButton variant="ghost" size="icon" aria-label="Remover gestor">
        <UserMinus className="size-4 text-danger-600" aria-hidden="true" />
      </SubmitButton>
    </form>
  );
}

/**
 * Roadmap Tier 0/Tier 4: única superfície de produto pra `school_managers`
 * -- a atribuição existia só como RLS/schema, nunca alcançável por
 * ninguém. `candidates` já vem filtrado (sem quem já gerencia esta
 * escola) pra evitar a corrida óbvia de tentar atribuir duas vezes.
 */
export function SchoolManagersSection({
  schoolId,
  managers,
  candidates,
}: {
  schoolId: string;
  managers: SchoolManagerRow[];
  candidates: AdminUserRow[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {managers.length === 0 ? (
        <EmptyState title="Nenhum gestor atribuído" description="Sem gestor, só o admin edita o perfil desta escola." />
      ) : (
        <ul className="flex flex-col gap-2">
          {managers.map((manager) => (
            <li
              key={manager.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3"
            >
              <span className="text-sm font-medium text-neutral-900">{manager.fullName ?? "(sem nome)"}</span>
              <RemoveManagerButton schoolId={schoolId} managerId={manager.id} />
            </li>
          ))}
        </ul>
      )}
      <AssignManagerForm schoolId={schoolId} candidates={candidates} />
    </div>
  );
}
