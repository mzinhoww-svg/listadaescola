import * as React from "react";
import Link from "next/link";

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
 * Header reutilizável — logo, navegação e slot de ações (ex.: entrar,
 * avatar). Áreas diferentes (pública, conta, admin) passam `navItems` e
 * `actions` próprios; o componente em si não sabe nada de auth/rotas.
 *
 * Onda 2 P12: era um client component só por causa do estado do menu
 * sanduíche. Com os links empilhados no mobile (ver abaixo) não sobrou
 * estado nenhum, então virou server component -- e o header parou de
 * mandar JavaScript para o browser.
 */
function Header({
  homeHref = "/",
  logoLabel = "Listada Escola",
  navItems = [],
  actions,
  className,
}: HeaderProps) {
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

        <div className="flex items-center gap-2">{actions}</div>

      </div>

      {/*
        Onda 2 P12. O DESIGN.md é explícito: "Em mobile, os mesmos links
        empilham sem virar menu sanduíche -- são poucos, e esconder custaria
        mais do que mostrar." São 4 links curtos, e escondê-los atrás de um
        hambúrguer no dispositivo que é o piso do projeto custava um toque
        extra para toda a navegação do site. Aqui eles viram uma segunda
        linha, que envolve sozinha se não couber.
      */}
      {navItems.length > 0 && (
        <nav aria-label="Principal (mobile)" className="border-t border-neutral-200 px-4 py-2 md:hidden">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="-mx-1 block rounded-lg px-1 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

export { Header };
