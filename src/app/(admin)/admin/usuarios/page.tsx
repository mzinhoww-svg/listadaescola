import type { Metadata } from "next";

import { getAdminUsers } from "@/lib/admin/users";
import { getCurrentUser } from "@/lib/auth/session";
import { UserRoleForm } from "@/components/admin/user-role-form";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Usuários" };

const ROLE_LABEL: Record<string, string> = {
  USER: "Usuário",
  EDITOR: "Editor",
  SCHOOL_MANAGER: "Gestor de escola",
  STORE_MANAGER: "Gestor de papelaria",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super admin",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function AdminUsersPage() {
  const [users, currentUser] = await Promise.all([getAdminUsers(), getCurrentUser()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Usuários</h1>
        <p className="text-sm text-neutral-500">Conta, papel e data de cadastro. Histórico de ações fica no audit log.</p>
      </div>

      {users.length === 0 ? (
        <EmptyState title="Nenhum usuário" description="Nenhum usuário cadastrado ainda." />
      ) : (
        <Table>
          <TableCaption>Usuários cadastrados</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Papel atual</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead className="text-right">Alterar papel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.fullName ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "primary" : "neutral"}>
                    {ROLE_LABEL[user.role] ?? user.role}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(user.createdAt)}</TableCell>
                <TableCell className="text-right">
                  {user.id === currentUser?.id ? (
                    <span className="text-sm text-neutral-500">Você</span>
                  ) : (
                    <UserRoleForm userId={user.id} currentRole={user.role} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
