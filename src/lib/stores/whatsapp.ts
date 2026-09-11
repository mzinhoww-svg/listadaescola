/**
 * PRD RF-012: "o telefone deve ser validado e normalizado no servidor
 * antes da geração do link." Pure functions (no framework dependency) so
 * both the redirect route handler and any future admin validation can
 * reuse the same logic.
 */

/**
 * Accepts any human-entered Brazilian phone shape (with/without country
 * code, punctuation, spaces) and returns digits-only in `55DDNNNNNNNNN`
 * form for wa.me, or `null` when the input can't be a real Brazilian
 * number -- never guesses a plausible-looking fallback (same "não
 * fabricar" principle as distance).
 */
export function normalizeWhatsappNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let national = digits;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    national = digits.slice(2);
  } else if (digits.length === 12 || digits.length === 13) {
    // Right length for "55 + DDD + number" but doesn't actually start with
    // the country code -- not a Brazilian number we can trust.
    return null;
  }

  // national must now be DDD (2) + 8 (landline) or 9 (mobile) digits.
  if (national.length !== 10 && national.length !== 11) return null;

  const ddd = Number(national.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;

  return `55${national}`;
}

export interface WhatsappMessageItem {
  name: string;
  quantity: number;
  unit: string | null;
}

export interface WhatsappMessageInput {
  schoolName: string;
  seriesName: string;
  schoolYear: number;
  items: WhatsappMessageItem[];
}

/** Same "prefilled only" rule as buildWhatsappMessage -- used when there's
 * no school/list context to build an itemized message from (Prompt 15's
 * standalone papelaria detail page, reached directly, not from a school's
 * list). */
export function buildGenericWhatsappMessage(storeName: string): string {
  return `Olá! Vi a ${storeName} no Listada Escola e gostaria de saber sobre produtos, preços e disponibilidade para material escolar.`;
}

/** Prefilled text only -- wa.me opens WhatsApp's own compose screen, it never sends by itself. */
export function buildWhatsappMessage({ schoolName, seriesName, schoolYear, items }: WhatsappMessageInput): string {
  const itemLines = items
    .map((item) => `- ${item.quantity}x ${item.name}${item.unit ? ` (${item.unit})` : ""}`)
    .join("\n");

  return [
    `Olá! Encontrei a lista escolar de ${schoolName} (${seriesName} - ${schoolYear}) no Listada Escola e gostaria de saber preço e disponibilidade destes itens:`,
    "",
    itemLines,
    "",
    "Vocês têm em estoque? Qual o valor total e as formas de entrega/retirada?",
  ].join("\n");
}
