import type { Metadata } from "next";

import { ScaffoldNotice } from "@/components/dev/scaffold-notice";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Sugerir escola" };

export default function SugerirEscolaPage() {
  return (
    <>
      <ScaffoldNotice promptRef="Prompt 10 — wizard de contribuição de lista (sugestão de escola)" />
      <Card>
        <CardHeader>
          <CardTitle>Dados da escola</CardTitle>
          <CardDescription>Etapa 1 de 4 · Dados → Endereço → Contato → Revisão</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input label="Nome da escola" placeholder="Como a escola é conhecida" />
          <Button className="self-start">Continuar</Button>
        </CardContent>
      </Card>
    </>
  );
}
