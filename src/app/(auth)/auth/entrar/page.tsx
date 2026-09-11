import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { getSafeRedirect } from "@/lib/safe-redirect";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const safeNext = getSafeRedirect(next, "/minha-conta");

  const user = await getCurrentUser();
  if (user) redirect(safeNext);

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1">Entrar</CardTitle>
        <CardDescription>Acesse sua conta para contribuir com listas.</CardDescription>
      </CardHeader>
      <CardContent>
        {error === "callback_failed" && (
          <p role="alert" className="mb-4 text-sm text-danger-600">
            Não foi possível confirmar o link. Ele pode ter expirado — tente novamente.
          </p>
        )}
        <LoginForm next={safeNext} />
      </CardContent>
    </Card>
  );
}
