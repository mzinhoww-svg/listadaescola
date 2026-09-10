import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/ui/header";

export interface FooterProps {
  columns?: { title: string; items: NavItem[] }[];
  className?: string;
}

function Footer({ columns = [], className }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className={cn("border-t border-neutral-200 bg-neutral-50", className)}>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {columns.length > 0 && (
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((column) => (
              <div key={column.title} className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-neutral-900">{column.title}</p>
                <ul className="flex flex-col gap-2">
                  {column.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm text-neutral-600 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <p className="mt-8 text-xs text-neutral-500">
          © {year} Listada Escola. Escolas com base em dados públicos do INEP.
        </p>
      </div>
    </footer>
  );
}

export { Footer };
