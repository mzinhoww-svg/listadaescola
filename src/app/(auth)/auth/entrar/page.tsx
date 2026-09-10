import type { Metadata } from "next";
import Link from "next/link";

import { ScaffoldNotice } from "@/components/dev/scaffold-notice";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Entrar" };

export default function EntrarPage() {
  return (
    <>
      <ScaffoldNotice promptRef="Prompt 03 — auth, profiles e RBAC" />
      <Card>
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse sua conta para contribuir com listas.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input label="E-mail" type="email" autoComplete="email" required />
          <Input label="Senha" type="password" autoComplete="current-password" required />
          <Button className="mt-2" type="submit">
            Entrar
          </Button>
          <p className="text-center text-sm text-neutral-500">
            Não tem conta?{" "}
            <Link href="/auth/criar-conta" className="font-medium text-primary-600 hover:underline">
              Criar conta
            </Link>
          </p>
        </CardContent>
      </Card>
    </>
  );
}
