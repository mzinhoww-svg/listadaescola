import Link from "next/link";
import { Store } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { getManagedStore } from "@/lib/stores/manager";
import { getOwnStoreClaims } from "@/lib/stores/store-claims";
import { Header } from "@/components/ui/header";
import { LogoutButton } from "@/components/auth/logout-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Minha papelaria", href: "/minha-papelaria" },
  { label: "Pedidos", href: "/minha-papelaria/pedidos" },
];

/**
 * Guard da área do gestor (Onda 6).
 *
 * O guard é o VÍNCULO (`store_managers`, via getManagedStore), não o papel
 * `STORE_MANAGER` do perfil -- diferente de `(admin)`, que usa
 * `requireRole`. Motivo: `approve_store_claim()` só promove para
 * STORE_MANAGER quem ainda é 'USER' (um EDITOR ou um ADMIN que também
 * tenha papelaria mantém o papel maior), então checar papel aqui trancaria
 * gente do lado de fora da própria loja. O vínculo é exatamente o que
 * `is_store_manager()` -- o helper que a RLS usa -- consulta, então guard
 * de rota e banco dizem a mesma coisa.
 *
 * E, como sempre: este guard é UX. Quem autoriza de verdade é a RLS.
 */
export default async function StoreManagerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/minha-papelaria");
  const store = await getManagedStore();

  const shell = (content: React.ReactNode) => (
    <div className="flex min-h-full flex-1 flex-col">
      <Header
        navItems={store ? navItems : []}
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

  if (!store) {
    const claims = await getOwnStoreClaims();
    const pending = claims.find((claim) => claim.status === "SUBMITTED");
    const rejected = claims.find((claim) => claim.status === "REJECTED");

    if (pending) {
      return shell(
        <EmptyState
          icon={Store}
          title="Solicitação em análise"
          description={`Recebemos o pedido para ${pending.storeName} (${pending.municipality}/${pending.uf}). Assim que aprovarmos, esta área vira o painel da sua papelaria.`}
          action={
            <Button asChild variant="outline">
              <Link href="/para-papelarias">Como funciona para papelarias</Link>
            </Button>
          }
        />
      );
    }

    return shell(
      <EmptyState
        icon={Store}
        title="Você ainda não gerencia uma papelaria"
        description={
          rejected?.rejectionReason
            ? `Sua última solicitação não foi aprovada: ${rejected.rejectionReason}`
            : "Cadastre a sua para aparecer nas listas escolares da sua região e receber pedidos de orçamento pelo WhatsApp."
        }
        action={
          <Button asChild>
            <Link href="/cadastrar-papelaria">Cadastrar minha papelaria</Link>
          </Button>
        }
      />
    );
  }

  return shell(children);
}
