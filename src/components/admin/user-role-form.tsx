"use client";

import { useActionState } from "react";

import { setUserRoleAction, type FormState } from "@/lib/admin/user-actions";
import type { UserRole } from "@/lib/admin/users";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "USER", label: "Usuário" },
  { value: "EDITOR", label: "Editor" },
  { value: "SCHOOL_MANAGER", label: "Gestor de escola" },
  { value: "STORE_MANAGER", label: "Gestor de papelaria" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Super admin" },
];

export function UserRoleForm({ userId, currentRole }: { userId: string; currentRole: UserRole }) {
  const [state, formAction] = useActionState(setUserRoleAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <Select label="Papel" name="role" hideLabel defaultValue={currentRole} className="h-9">
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <SubmitButton size="sm" variant="outline">
        Salvar
      </SubmitButton>
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
