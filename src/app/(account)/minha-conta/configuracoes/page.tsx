import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Configurações" };

export default function ConfiguracoesPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-neutral-900">Configurações</h1>
      <div className="mt-6 max-w-sm">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Alterar senha</h2>
        <ResetPasswordForm />
      </div>
    </>
  );
}
