import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PublishListForm } from "@/components/admin/publish-list-form";

export const metadata: Metadata = { title: "Nova lista" };
export const dynamic = "force-dynamic";

export default function NovaListaPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/listas"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Listas
      </Link>
      <h1 className="mb-1 text-2xl font-semibold text-neutral-900">Nova lista</h1>
      <p className="mb-6 max-w-[65ch] text-neutral-600">
        Publica direto, sem passar pela fila de moderação — ela existe para conteúdo enviado por
        terceiros, e aqui a fonte é você.
      </p>
      <PublishListForm />
    </div>
  );
}
