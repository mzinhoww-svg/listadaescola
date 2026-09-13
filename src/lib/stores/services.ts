/**
 * Vocabulário de serviços de papelaria (Onda 6).
 *
 * `store_services.service` é `text` livre no schema, o que é ótimo para o
 * admin e péssimo para um formulário público: sem uma lista fechada,
 * "encapa livro", "Encapamento", "encapamento de livros" viram três
 * serviços diferentes e nenhum filtro funciona depois. A lista abaixo é o
 * conjunto que o autocadastro e a área do gestor oferecem; o admin
 * continua livre para gravar qualquer texto pela sua própria tela.
 *
 * Nada aqui é pagamento: parcelamento, forma de pagamento e afins estão
 * deliberadamente fora (CLAUDE.md -- papelaria termina em WhatsApp +
 * tracking). Entrega e retirada também não estão aqui: já são colunas
 * próprias (`offers_delivery` / `offers_pickup`).
 */
export const STORE_SERVICE_OPTIONS = [
  "Monta a lista completa",
  "Encomenda itens em falta",
  "Orçamento por WhatsApp",
  "Etiquetas personalizadas",
  "Encapamento de livros e cadernos",
  "Impressão e cópias",
  "Uniformes escolares",
  "Reserva de material",
] as const;

export type StoreServiceOption = (typeof STORE_SERVICE_OPTIONS)[number];

/** Mantém só os serviços do vocabulário, sem repetição e na ordem canônica
 * -- o que chega do formulário é `FormData`, ou seja, texto arbitrário. */
export function sanitizeStoreServices(values: readonly string[]): string[] {
  const chosen = new Set(values.map((value) => value.trim()));
  return STORE_SERVICE_OPTIONS.filter((option) => chosen.has(option));
}
