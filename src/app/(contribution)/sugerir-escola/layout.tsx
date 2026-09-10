import Link from "next/link";
import { X } from "lucide-react";

import { requireUser } from "@/lib/auth/session";

export default async function SuggestSchoolLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/sugerir-escola");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-neutral-50">
      <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 sm:px-6">
        <span className="text-sm font-semibold text-neutral-900">Sugerir escola</span>
        <Link
          href="/"
          aria-label="Cancelar e sair"
          className="inline-flex size-11 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          <X className="size-5" aria-hidden="true" />
        </Link>
      </header>
      <main id="conteudo-principal" className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
