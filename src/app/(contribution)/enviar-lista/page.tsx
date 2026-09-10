import type { Metadata } from "next";

import { ScaffoldNotice } from "@/components/dev/scaffold-notice";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Enviar lista" };

export default function EnviarListaPage() {
  return (
    <>
      <ScaffoldNotice promptRef="Prompt 10 — wizard de contribuição de lista" />
      <Card>
        <CardHeader>
          <CardTitle>Qual escola?</CardTitle>
          <CardDescription>Etapa 1 de 6 · Escola → Ano → Série → Itens → Anexo → Revisão</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input label="Nome da escola" placeholder="Buscar por nome ou código INEP" />
          <Button className="self-start">Continuar</Button>
        </CardContent>
      </Card>
    </>
  );
}
