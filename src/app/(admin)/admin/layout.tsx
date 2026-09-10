import Link from "next/link";
import { ShieldX } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { AdminShell } from "./admin-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("/admin", ADMIN_ROLES);

  if (!profile) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center p-4">
        <EmptyState
          icon={ShieldX}
          title="Acesso restrito"
          description="Sua conta não tem permissão para acessar a administração."
          action={
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/">Voltar ao início</Link>
              </Button>
              <LogoutButton />
            </div>
          }
        />
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
