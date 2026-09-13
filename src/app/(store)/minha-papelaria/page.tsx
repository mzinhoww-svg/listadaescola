import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ExternalLink, Inbox } from "lucide-react";

import { getManagedStore, getStoreQuoteRequests, summarizeQuoteRequests } from "@/lib/stores/manager";
import { storeHref } from "@/lib/stores/store-profile";
import { normalizeWhatsappNumber } from "@/lib/stores/whatsapp";
import { StoreManagerForm } from "@/components/stores/store-manager-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Minha papelaria",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MinhaPapelariaPage() {
  const store = await getManagedStore();
  // O layout já trata a ausência de papelaria; aqui é só o estreitamento
  // de tipo (e a rede de segurança se a rota for atingida direto).
  if (!store) notFound();

  const requests = await getStoreQuoteRequests(store.id);
  const summary = summarizeQuoteRequests(requests);
  const whatsappValid = normalizeWhatsappNumber(store.whatsapp) !== null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-neutral-900">{store.name}</h1>
          <Badge variant={store.isActive ? "success" : "neutral"}>{store.isActive ? "Visível" : "Não publicada"}</Badge>
          {store.isSponsored && <Badge variant="sponsored">Patrocinada</Badge>}
        </div>
        <p className="text-sm text-neutral-500">
          {store.municipality}/{store.uf}
          {store.isActive && (
            <>
              {" · "}
              <Link href={storeHref(store)} className="inline-flex items-center gap-1 text-primary-700 hover:underline">
                Ver página pública
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </Link>
            </>
          )}
        </p>
      </div>

      {!store.isActive && (
        <p className="flex items-start gap-2 rounded-lg bg-warning-50 p-3 text-sm text-warning-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Sua papelaria está fora do ar no momento e não aparece nas buscas. Quem publica e despublica é a nossa
          equipe — fale com a gente se isso não estiver certo.
        </p>
      )}

      {!whatsappValid && (
        <p className="flex items-start gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          O número de WhatsApp cadastrado não é válido, então o botão de orçamento não está aparecendo para as
          famílias. Corrija abaixo.
        </p>
      )}

      <Link
        href="/minha-papelaria/pedidos"
        className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
      >
        <Card className="transition-colors hover:border-primary-300">
          <CardHeader>
            <Inbox className="size-5 text-primary-600" aria-hidden="true" />
            <CardTitle>Pedidos de orçamento</CardTitle>
            <CardDescription>
              {summary.total === 0
                ? "Nenhum pedido ainda."
                : `${summary.total} no total · ${summary.last7Days} nos últimos 7 dias`}
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Dados da papelaria</CardTitle>
          <CardDescription>
            É isso que as famílias veem na sua página e na lista de papelarias próximas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StoreManagerForm store={store} />
        </CardContent>
      </Card>
    </div>
  );
}
