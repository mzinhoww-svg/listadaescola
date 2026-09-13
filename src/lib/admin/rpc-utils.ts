/**
 * Supabase's generated RPC `Args` types mark every plain (no SQL
 * `DEFAULT`) parameter as required and non-null, even though Postgres
 * itself accepts NULL for any parameter without a NOT NULL-style
 * constraint. The admin upsert/update RPCs in this module intentionally
 * take nullable params (optional text fields, "id or null means create")
 * -- this narrows a `T | null` value back to `T` only at the `.rpc()`
 * call boundary, where the mismatch is against the generated type, not
 * against what the database actually accepts.
 */
export function nullableArg<T>(value: T | null): T {
  return value as T;
}

/**
 * Postgres RPC `raise exception` messages surface verbatim as
 * `error.message` -- fine for logs, wrong for an otherwise all-Portuguese
 * admin UI (confirmed live: "sale value is required when status is
 * CONVERTED" and "weights must sum to 1.0 (got 1.50)" both render raw,
 * unstyled-relative-to-nothing-else-being-in-English, in the middle of a
 * form). Translating inside the SQL functions themselves would mean
 * editing several already-applied migrations for a wording change; this
 * is the same fix at the one place every admin action already funnels
 * `error.message` through. Unknown messages pass through unchanged --
 * this only ever improves known cases, never hides a new one.
 */
export function translateAdminDbError(message: string): string {
  const sumMatch = message.match(/weights must sum to 1\.0 \(got ([\d.]+)\)/);
  if (sumMatch) return `Os pesos precisam somar 1,0 (soma atual: ${sumMatch[1].replace(".", ",")}).`;

  if (message.includes("sale value is required when status is CONVERTED")) {
    return "Informe o valor da venda quando o status for \"Convertido\".";
  }

  const noMatch = message.match(/^no (school|store) found matching "(.+)"$/);
  if (noMatch) {
    const entity = noMatch[1] === "school" ? "escola" : "papelaria";
    return `Nenhuma ${entity} encontrada com o nome exato "${noMatch[2]}".`;
  }

  const multiMatch = message.match(/^(\d+) matches for "(.+)" -- use the exact name$/);
  if (multiMatch) {
    return `${multiMatch[1]} escolas ou papelarias correspondem a "${multiMatch[2]}" -- use o nome exato de uma delas.`;
  }

  if (message.includes("end date must be after start date")) {
    return "A data de fim precisa ser depois da data de início.";
  }

  if (message.includes("rejection reason is required")) {
    return "Informe o motivo da recusa.";
  }

  if (message.includes("you cannot review your own review") || message.includes("you cannot review your own submission")) {
    return "Você não pode moderar o próprio envio.";
  }

  const notAwaitingMatch = message.match(/^(review|submission) .+ is not awaiting (moderation|review) \(status=(\w+)\)$/);
  if (notAwaitingMatch) {
    return "Este item já foi moderado por outra pessoa -- atualize a página para ver o estado atual.";
  }

  // Catálogo/e-commerce (admin_crud.sql, admin_upsert_partner_sale_report).
  if (message.includes("partner name is required")) return "Informe o nome do parceiro.";
  if (message.includes("product name is required")) return "Informe o nome do produto.";
  if (message.includes("partner is required")) return "Selecione um parceiro.";
  if (message.includes("product is required")) return "Selecione um produto.";
  if (message.includes("price hint cannot be negative")) return "O preço estimado não pode ser negativo.";
  if (/^ecommerce partner .+ not found$/.test(message)) return "Parceiro não encontrado.";
  if (/^product .+ not found$/.test(message)) return "Produto não encontrado.";
  if (/^ecommerce product .+ not found$/.test(message)) return "Oferta de parceiro não encontrada.";
  if (/^ecommerce product .+ does not belong to partner .+$/.test(message)) {
    return "Este produto não pertence ao parceiro selecionado.";
  }
  if (/^partner sale report .+ not found$/.test(message)) return "Relatório de venda não encontrado.";

  return message;
}
