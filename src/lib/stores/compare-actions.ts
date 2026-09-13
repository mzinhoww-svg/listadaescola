"use server";

import { recordAnalyticsEvent } from "@/lib/analytics/record-event";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Same ceiling as `getNearbyStores`' default limit -- keeps the event's
 * metadata bounded no matter what a caller posts. */
const MAX_COMPARED_STORES = 10;

export interface QuoteComparisonStartedInput {
  schoolId: string;
  listId: string;
  storeIds: string[];
}

/**
 * Onda 8: registra que o usuário decidiu pedir o MESMO orçamento a mais
 * de uma papelaria -- o comportamento real do mercado brasileiro, que
 * antes não existia no produto nem no analytics. Cada abertura de
 * conversa continua gerando o `whatsapp_click` de sempre em
 * `/api/store/whatsapp`; este evento é só o denominador ("quantos
 * comparam, contra quantas lojas") que aquele clique sozinho não conta.
 *
 * Não devolve nada e não lê nada: a única coisa que este Server Action
 * consegue fazer é gravar um evento de analytics -- o mesmo que qualquer
 * visitante já provoca abrindo uma página. Os ids são só atribuição, e
 * chegam validados no formato e limitados no volume antes de virarem
 * metadata. Nada aqui autoriza nada nem processa pagamento: comparar
 * orçamento é abrir N conversas de WhatsApp, uma de cada vez.
 */
export async function recordQuoteComparisonStartedAction(input: QuoteComparisonStartedInput): Promise<void> {
  const storeIds = input.storeIds.filter(isUuid).slice(0, MAX_COMPARED_STORES);
  if (!isUuid(input.schoolId) || !isUuid(input.listId) || storeIds.length < 2) return;

  await recordAnalyticsEvent({
    eventType: "whatsapp_compare_started",
    schoolId: input.schoolId,
    listId: input.listId,
    metadata: { storeCount: storeIds.length, storeIds },
  });
}
