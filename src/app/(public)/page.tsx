import { Search } from "lucide-react";

import { ScaffoldNotice } from "@/components/dev/scaffold-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <ScaffoldNotice promptRef="Prompt 06 — home, busca e resultados" />

      <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
        Encontre a escola, descubra a lista.
      </h1>
      <p className="mt-3 max-w-xl text-lg text-neutral-600">
        Pesquise por CEP ou cidade, veja escolas de Mato Grosso e chegue até a
        lista escolar certa.
      </p>

      <Card className="mt-8">
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="CEP ou cidade"
              placeholder="Ex.: 78000-000 ou Cuiabá"
              autoComplete="off"
            />
          </div>
          <Button size="lg" className="sm:w-auto">
            <Search className="size-4" aria-hidden="true" />
            Buscar escolas
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
