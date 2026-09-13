"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/logout-button";
import { DialogRoot, DialogPortal, DialogOverlay, DialogTitle } from "@/components/ui/dialog-primitives";
import { ROLE_LABEL, type UserRole } from "@/lib/auth/roles";

const navItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Escolas", href: "/admin/escolas" },
  { label: "Listas", href: "/admin/listas" },
  { label: "Moderação", href: "/admin/moderacao" },
  { label: "Papelarias", href: "/admin/papelarias" },
  { label: "Parceiros", href: "/admin/ecommerce" },
  { label: "Catálogo", href: "/admin/catalogo" },
  { label: "Patrocínios", href: "/admin/patrocinios" },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "Vendas", href: "/admin/vendas" },
  { label: "Usuários", href: "/admin/usuarios" },
  { label: "Auditoria", href: "/admin/auditoria" },
];

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Administração">
      <ul className="flex flex-col gap-1">
        {navItems.map((item) => {
          // Exact match for the dashboard root; prefix match for every
          // other section so a detail route (e.g. /admin/escolas/[id])
          // still highlights its parent "Escolas" entry.
          const isActive =
            item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
                  isActive
                    ? "bg-primary-800 text-white"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export interface AdminShellProfile {
  fullName: string | null;
  role: UserRole;
}

/**
 * Roadmap C6: um admin podia promover qualquer pessoa a Admin/Super Admin
 * em `/admin/usuarios` sem nunca ver o próprio nome ou papel em lugar
 * nenhum da shell -- o único jeito de saber "sou super admin ou só
 * admin?" era abrir a própria linha na tabela de usuários.
 */
function AdminIdentity({ profile }: { profile: AdminShellProfile }) {
  return (
    <div className="px-2 text-sm">
      <p className="truncate font-medium text-white">{profile.fullName ?? "Sem nome"}</p>
      <p className="text-neutral-400">{ROLE_LABEL[profile.role]}</p>
    </div>
  );
}

export function AdminShell({ children, profile }: { children: React.ReactNode; profile: AdminShellProfile }) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const mobileNavId = React.useId();

  return (
    <div className="flex min-h-full flex-1">
      {/* Root layout (src/app/layout.tsx) already renders a skip link to
          this same #conteudo-principal target on every page -- a second
          one here just makes a keyboard user tab through two identical
          links before reaching content. */}

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-neutral-800 bg-neutral-900 p-4 lg:flex">
        <Link href="/admin" className="mb-4 px-2 text-sm font-semibold text-white">
          Listada Escola · Admin
        </Link>
        <AdminNav />
        <div className="mt-auto flex flex-col gap-3 border-t border-neutral-800 pt-4">
          <AdminIdentity profile={profile} />
          <LogoutButton className="w-full justify-start text-neutral-300 hover:bg-neutral-800 hover:text-white" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:hidden">
          <span className="text-sm font-semibold text-neutral-900">Admin</span>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            aria-expanded={mobileNavOpen}
            aria-controls={mobileNavId}
            aria-label={mobileNavOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </header>
        {/* Driven by the same `mobileNavOpen` state as the button above
            (not DialogPrimitive.Trigger) so the existing hamburger/X
            toggle is untouched -- Radix still gives this the same focus
            trap, Escape, overlay-click-to-close and focus-return-on-close
            as Modal/Drawer, controlled entirely through `open`. */}
        <DialogRoot open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <DialogPortal>
            <DialogOverlay className="lg:hidden" />
            <DialogPrimitive.Content
              id={mobileNavId}
              className="fixed inset-x-0 top-14 z-50 bg-neutral-900 p-4 lg:hidden"
            >
              <DialogTitle className="sr-only">Menu de navegação</DialogTitle>
              <AdminNav onNavigate={() => setMobileNavOpen(false)} />
              <div className="mt-2 flex flex-col gap-3 border-t border-neutral-800 pt-2">
                <AdminIdentity profile={profile} />
                <LogoutButton className="w-full justify-start text-neutral-300 hover:bg-neutral-800 hover:text-white" />
              </div>
            </DialogPrimitive.Content>
          </DialogPortal>
        </DialogRoot>
        <main id="conteudo-principal" className="min-w-0 flex-1 bg-neutral-50 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
