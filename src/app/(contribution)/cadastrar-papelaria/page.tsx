import type { Metadata } from "next";
import Link from "next/link";
import { Clock3 } from "lucide-react";

import { getClaimableStores, getOwnStoreClaims } from "@/lib/stores/store-claims";
import { StoreClaimForm } from "@/components/stores/store-claim-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Cadastrar papelaria",
  // Página de fluxo autenticado: não é conteúdo para busca.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CadastrarPapelariaPage() {
  const [claimableStores, ownClaims] = await Promise.all([getClaimableStores(), getOwnStoreClaims()]);
  const pending = ownClaims.find((claim) => claim.status === "SUBMITTED");

  // Já existe um pedido na fila: repetir o formulário só levaria ao erro
  // do índice parcial de unicidade. Melhor dizer o estado.
  if (pending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle as="h1">Sua solicitação está em análise</CardTitle>
          <CardDescription>
            Recebemos o pedido para {pending.storeName} ({pending.municipality}/{pending.uf}). Nossa equipe confere
            os dados e libera o acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <p className="flex items-center gap-2 text-sm text-neutral-600">
            <Clock3 className="size-4 text-neutral-400" aria-hidden="true" />
            Enviada em {new Date(pending.createdAt).toLocaleDateString("pt-BR")}
          </p>
          <Button asChild variant="outline">
            <Link href="/minha-papelaria">Acompanhar em Minha papelaria</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1">Cadastre sua papelaria</CardTitle>
        <CardDescription>
          Famílias que abrem a lista de material de uma escola perto de você passam a ver sua papelaria e podem
          pedir orçamento pelo WhatsApp, com a lista inteira já escrita na mensagem.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StoreClaimForm claimableStores={claimableStores} />
      </CardContent>
    </Card>
  );
}
