import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { getSafeRedirect } from "@/lib/safe-redirect";
import { SignupForm } from "@/components/auth/signup-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Criar conta" };

export default async function CriarContaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = getSafeRedirect(next, "/minha-conta");

  const user = await getCurrentUser();
  if (user) redirect(safeNext);

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1">Criar conta</CardTitle>
        <CardDescription>Crie uma conta para enviar listas e sugerir escolas.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm next={safeNext} />
      </CardContent>
    </Card>
  );
}
