import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Prompt 19 (produção): sem este arquivo, uma rota inexistente caía no
 * 404 default do Next.js -- em inglês ("This page could not be found."),
 * inconsistente com o resto do app (100% em português). Não usa o Header/
 * Footer público de propósito: um not-found na raiz do app cobre qualquer
 * caminho não roteado, não só os que ficam dentro de `(public)`.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4 py-8">
      <EmptyState
        title="Página não encontrada"
        description="O endereço que você acessou não existe ou foi removido."
        action={
          <Button asChild variant="outline">
            <Link href="/">Voltar para o início</Link>
          </Button>
        }
      />
    </div>
  );
}
