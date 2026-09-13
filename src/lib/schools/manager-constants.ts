/**
 * Constantes compartilhadas da área do gestor de escola (Onda 7).
 *
 * Vive fora de `manager-actions.ts` pela mesma razão que
 * `src/lib/auth/verification.ts` vive fora de `auth/actions.ts`: todo
 * export de um módulo `"use server"` precisa ser uma função async, então
 * uma constante simplesmente não pode morar lá -- e tanto o formulário
 * (client) quanto a Server Action precisam enxergar exatamente a mesma
 * lista.
 */

/**
 * Tipos de contato oferecidos ao gestor. `school_contacts.contact_type` é
 * `text` livre no schema (20260910200200_schools.sql) -- não há enum nem
 * CHECK -- então esta lista é uma decisão de produto, não do banco. Todos
 * os valores aqui são rótulos que `contactTypeLabel`
 * (src/lib/schools/format.ts) já sabe renderizar em português; incluir um
 * valor fora daquele mapa faria a página pública imprimir o valor cru.
 */
export const MANAGER_CONTACT_TYPES = [
  "PHONE",
  "MOBILE",
  "WHATSAPP",
  "EMAIL",
  "SITE",
  "INSTAGRAM",
  "OTHER",
] as const;
