"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Prompt 19 (produção): sem este arquivo, um erro não tratado em qualquer
 * página derrubava toda a rota na tela de erro genérica do Next.js (ou,
 * em produção, uma página em branco) -- nunca testado ao vivo até agora
 * porque nenhum dos fluxos exercitados neste projeto quebrou dessa forma.
 * Cobre qualquer segmento abaixo da raiz; erros na própria raiz (layout.tsx)
 * exigem global-error.tsx (arquivo irmão), que também foi adicionado.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4 py-8">
      <EmptyState
        title="Algo deu errado"
        description="Não foi possível carregar esta página. Tente novamente em alguns instantes."
        action={
          <Button onClick={reset} variant="outline">
            Tentar novamente
          </Button>
        }
      />
    </div>
  );
}
