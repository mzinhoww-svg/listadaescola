"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

export interface NavItem {
  label: string;
  href: string;
}

export interface HeaderProps {
  homeHref?: string;
  logoLabel?: string;
  navItems?: NavItem[];
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Header reutilizável — logo, nav desktop, menu mobile acessível
 * (aria-expanded/controls, fecha com Escape) e slot de ações (ex.: entrar,
 * avatar). Áreas diferentes (pública, conta, admin) passam `navItems` e
 * `actions` próprios; o componente em si não sabe nada de auth/rotas.
 */
function Header({
  homeHref = "/",
  logoLabel = "Listada Escola",
  navItems = [],
  actions,
  className,
}: HeaderProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const menuId = React.useId();
  const toggleRef = React.useRef<HTMLButtonElement>(null);

  /** Closing without moving focus back to the toggle drops it wherever the
   * browser sends focus when the focused element becomes `hidden` (usually
   * <body>) -- a keyboard user loses their place entirely. */
  function closeMobileMenu() {
    setMobileOpen(false);
    toggleRef.current?.focus();
  }

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      // Functional update so this only refocuses the toggle when the menu
      // was actually open -- an unconditional focus() here would steal
      // focus from unrelated Escape presses elsewhere on the page (e.g. a
      // Dialog also listening for Escape).
      setMobileOpen((open) => {
        if (open) toggleRef.current?.focus();
        return false;
      });
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur",
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href={homeHref}
          aria-label={logoLabel}
          className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          <Logo />
        </Link>

        {navItems.length > 0 && (
          <nav aria-label="Principal" className="hidden md:block">
            <ul className="flex items-center gap-6">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm font-medium text-neutral-600 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="hidden items-center gap-2 md:flex">{actions}</div>

        {navItems.length > 0 && (
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 md:hidden"
            aria-expanded={mobileOpen}
            aria-controls={menuId}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {navItems.length > 0 && (
        <nav
          id={menuId}
          aria-label="Principal (mobile)"
          hidden={!mobileOpen}
          className="border-t border-neutral-200 px-4 py-3 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeMobileMenu}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          {actions && <div className="mt-3 flex flex-col gap-2">{actions}</div>}
        </nav>
      )}
    </header>
  );
}

export { Header };
