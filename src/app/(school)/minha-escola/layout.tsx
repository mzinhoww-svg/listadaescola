import Link from "next/link";
import { School } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { getManagedSchool } from "@/lib/schools/manager";
import { getOwnSchoolClaims } from "@/lib/schools/claims";
import { Header } from "@/components/ui/header";
import { LogoutButton } from "@/components/auth/logout-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Perfil da escola", href: "/minha-escola" },
  { label: "Listas", href: "/minha-escola/listas" },
];

/**
 * Guard da área do gestor de escola (Onda 7).
 *
 * O guard é o VÍNCULO (`school_managers`, via getManagedSchool), não o
 * papel `SCHOOL_MANAGER` do perfil -- diferente de `(admin)`, que usa
 * `requireRole`. Motivo: `approve_school_claim()` só promove para
 * SCHOOL_MANAGER quem ainda é 'USER' (um EDITOR, um STORE_MANAGER ou um
 * ADMIN que também dirija uma escola mantém o papel maior), então checar
 * papel aqui trancaria essas pessoas do lado de fora da própria escola. O
 * vínculo é exatamente o que `is_school_manager()` -- o helper que a RLS
 * usa -- consulta, então guard de rota e banco dizem a mesma coisa.
 *
 * E, como sempre: este guard é UX. Quem autoriza de verdade é a RLS
 * (`school_profiles_manager_update`, `school_contacts_manager_*`,
 * `school_images_manager_*`) e o gate interno de
 * `school_manager_publish_list`.
 */
export default async function SchoolManagerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/minha-escola");
  const school = await getManagedSchool();

  const shell = (content: React.ReactNode) => (
    <div className="flex min-h-full flex-1 flex-col">
      <Header
        navItems={school ? navItems : []}
        actions={
          <div className="flex items-center gap-3">
            <span className="max-w-40 truncate text-sm text-neutral-600">{user.email}</span>
            <LogoutButton />
          </div>
        }
      />
      <main id="conteudo-principal" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {content}
      </main>
    </div>
  );

  if (!school) {
    const claims = await getOwnSchoolClaims();
    const pending = claims.find((claim) => claim.status === "SUBMITTED");
    const rejected = claims.find((claim) => claim.status === "REJECTED");

    if (pending) {
      return shell(
        <EmptyState
          icon={School}
          title="Solicitação em análise"
          description={`Recebemos seu pedido de acesso ao perfil de ${pending.schoolName}. Nossa equipe confere os dados com a escola antes de liberar — assim que aprovarmos, esta área vira o painel dela.`}
          action={
            <Button asChild variant="outline">
              <Link href="/para-escolas">Como funciona para escolas</Link>
            </Button>
          }
        />
      );
    }

    return shell(
      <EmptyState
        icon={School}
        title="Você ainda não gerencia uma escola"
        description={
          rejected?.rejectionReason
            ? `Sua última solicitação não foi aprovada: ${rejected.rejectionReason}`
            : "Se você trabalha numa escola, peça acesso ao perfil dela para manter os dados e publicar as listas de material sem passar pela fila de moderação."
        }
        action={
          <Button asChild>
            <Link href="/reivindicar-escola">Reivindicar minha escola</Link>
          </Button>
        }
      />
    );
  }

  return shell(children);
}
