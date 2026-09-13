import { toDisplayCase } from "@/lib/utils";

/**
 * Onda 2 P7. `school_contacts.contact_type` é `text` livre -- não há enum
 * nem CHECK no schema (20260910200200_schools.sql:71) e a tabela está vazia,
 * então não dá para saber o conjunto real de valores. A página imprimia o
 * valor cru ("PHONE:", "EMAIL:").
 *
 * Este mapa cobre os rótulos canônicos previsíveis e cai num fallback
 * legível para qualquer coisa fora dele -- deliberadamente não inventa um
 * enum que o banco não tem.
 */
const CONTACT_TYPE_LABELS: Record<string, string> = {
  PHONE: "Telefone",
  TELEFONE: "Telefone",
  MOBILE: "Celular",
  CELULAR: "Celular",
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
  SITE: "Site",
  WEBSITE: "Site",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  FAX: "Fax",
  OTHER: "Outro",
  OUTRO: "Outro",
};

export function contactTypeLabel(raw: string): string {
  const key = raw.trim().toUpperCase();
  if (CONTACT_TYPE_LABELS[key]) return CONTACT_TYPE_LABELS[key];
  // Fallback: "SOCIAL_MEDIA" -> "Social media". Melhor do que o enum cru e
  // honesto sobre não conhecer o valor.
  const words = raw.trim().replace(/[_-]+/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Cada letra acentuada precisa entrar como CHAVE também, não só dentro da
 * classe: o município vem acentuado ("Cuiabá") e o endereço do INEP quase
 * sempre não ("CUIABA"). Mapear só a letra base deixaria o "á" cair no
 * escape literal e o sufixo não seria removido -- que é justamente o caso
 * que esta função existe para tratar.
 */
const ACCENT_GROUPS = ["aáàâãä", "eéèêë", "iíìîï", "oóòôõö", "uúùûü", "cç", "nñ"];

const ACCENT_CLASSES: Record<string, string> = Object.fromEntries(
  ACCENT_GROUPS.flatMap((group) => [...group].map((char) => [char, `[${group}]`]))
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Padrão que casa o texto ignorando acentuação. Necessário porque o endereço
 * do INEP costuma vir sem acento ("Cuiaba") enquanto `municipality` vem com
 * ("Cuiabá") -- comparar strings normalizadas e depois fatiar a original pelo
 * índice não funciona, já que remover marcas de combinação muda o tamanho.
 */
function accentInsensitivePattern(value: string): string {
  return [...value.toLowerCase()]
    .map((char) => ACCENT_CLASSES[char] ?? escapeRegExp(char))
    .join("");
}

/**
 * Onda 2 P7. O endereço do INEP frequentemente já termina em
 * "<município> - <UF>", e a página concatenava município e UF de novo:
 *
 *   "…78310-000 Comodoro - Mt. — Comodoro, MT"
 *
 * (o `toDisplayCase` ainda transformava a UF embutida em "Mt."). INEP é
 * master data e não se edita -- a correção é de apresentação: remove o
 * sufixo redundante do endereço antes de anexar o par canônico.
 */
export function formatSchoolAddress(
  address: string | null,
  municipality: string,
  uf: string
): string {
  const tail = `${municipality}, ${uf}`;
  if (!address?.trim()) return tail;

  const suffix = new RegExp(
    `[,\\s.\\-]*${accentInsensitivePattern(municipality)}\\s*[-/,]?\\s*${accentInsensitivePattern(uf)}\\s*\\.?\\s*$`,
    "i"
  );

  const head = address.trim().replace(suffix, "").replace(/[,\s.\-]+$/g, "").trim();
  return head ? `${toDisplayCase(head)} — ${tail}` : tail;
}
