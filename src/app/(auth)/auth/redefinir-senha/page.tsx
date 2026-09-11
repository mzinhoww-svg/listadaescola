import type { Metadata } from "next";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Redefinir senha" };

export default async function RedefinirSenhaPage() {
  const user = await getCurrentUser();

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1">Redefinir senha</CardTitle>
        <CardDescription>Escolha uma nova senha para sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        {user ? (
          <ResetPasswordForm />
        ) : (
          <p className="text-center text-sm text-neutral-600">
            Link inválido ou expirado.{" "}
            <Link href="/auth/recuperar-senha" className="font-medium text-primary-600 hover:underline">
              Solicite uma nova redefinição
            </Link>
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}
