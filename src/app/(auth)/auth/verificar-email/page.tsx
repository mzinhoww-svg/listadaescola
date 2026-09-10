import type { Metadata } from "next";
import { MailCheck } from "lucide-react";

import { ResendVerificationForm } from "@/components/auth/resend-verification-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Verifique seu e-mail" };

export default async function VerificarEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <MailCheck className="size-8 text-primary-600" aria-hidden="true" />
        <CardTitle>Verifique seu e-mail</CardTitle>
        <CardDescription>
          {email ? (
            <>
              Enviamos um link de confirmação para <strong className="text-neutral-700">{email}</strong>.
              Clique nele para ativar sua conta.
            </>
          ) : (
            "Enviamos um link de confirmação para o e-mail informado. Clique nele para ativar sua conta."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResendVerificationForm defaultEmail={email} />
      </CardContent>
    </Card>
  );
}
