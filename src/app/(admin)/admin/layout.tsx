"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Escolas", href: "/admin/escolas" },
  { label: "Listas", href: "/admin/listas" },
  { label: "Moderação", href: "/admin/moderacao" },
  { label: "Papelarias", href: "/admin/papelarias" },
  { label: "Parceiros", href: "/admin/ecommerce" },
  { label: "Patrocínios", href: "/admin/patrocinios" },
];

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Administração">
      <ul className="flex flex-col gap-1">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const mobileNavId = React.useId();

  return (
    <div className="flex min-h-full flex-1">
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo principal
      </a>

      <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-neutral-800 bg-neutral-900 p-4 lg:flex">
        <Link href="/admin" className="mb-4 px-2 text-sm font-semibold text-white">
          Listada Escola · Admin
        </Link>
        <AdminNav />
      </aside>

      <div className="flex flex-1 flex-col">
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
        {mobileNavOpen && (
          <div id={mobileNavId} className="bg-neutral-900 p-4 lg:hidden">
            <AdminNav onNavigate={() => setMobileNavOpen(false)} />
          </div>
        )}
        <main id="conteudo-principal" className="flex-1 bg-neutral-50 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
