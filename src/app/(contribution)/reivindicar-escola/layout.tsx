import Link from "next/link";
import { X } from "lucide-react";

import { requireUser } from "@/lib/auth/session";

/**
 * Onda 7 -- a reivindicação mora em `(contribution)`, junto de
 * `/enviar-lista`, `/sugerir-escola` e `/cadastrar-papelaria`: é a mesma
 * forma de interação -- um usuário autenticado manda uma solicitação que
 * cai numa fila de moderação, uma vez, e vai embora. O painel permanente
 * de quem já foi aprovado é `/minha-escola`.
 */
export default async function ReivindicarEscolaLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/reivindicar-escola");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-neutral-50">
      <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 sm:px-6">
        <span className="text-sm font-semibold text-neutral-900">Reivindicar escola</span>
        <Link
          href="/para-escolas"
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
