/**
 * Onda 4. Converte uma lista de material colada como texto em itens
 * estruturados.
 *
 * Esta é a peça que decide se publicar uma lista leva 30 segundos ou 10
 * minutos. O admin recebe a lista da escola como texto (WhatsApp, PDF
 * copiado, foto transcrita) e o formato varia muito; digitar item a item
 * num formulário é o que torna semear oferta caro.
 *
 * Deliberadamente conservador: quando não tem certeza, prefere jogar tudo
 * para `name` a inventar quantidade ou unidade. Um nome com ruído o admin
 * corrige em dois cliques; uma quantidade errada vira lista errada na mão de
 * uma família.
 */
export interface ParsedItem {
  name: string;
  quantity: number;
  unit: string | null;
  brand: string | null;
  is_required: boolean;
  notes: string | null;
}

/** Marcadores de bullet comuns em lista colada. */
const BULLET = /^\s*(?:[-–—*•·]|\d+[.)])\s+/;

/**
 * Quantidade no início: "2 cadernos", "02 cadernos", "2x caderno",
 * "2 x caderno", "2 - caderno", "2un caderno".
 * O nome tem que sobrar com pelo menos 2 caracteres, senão não era
 * quantidade -- evita comer o nome de itens como "3D" ou "2B".
 */
const LEADING_QTY = /^\s*(\d{1,3})\s*(?:x|un|und|unid|unidades?)?\s*(?:[-–—:]\s*)?\s+(.{2,})$/i;

/**
 * "(opcional)", "- opcional", "[opcionais]" em qualquer lugar da linha.
 * O radical precisa cobrir "opcional" E "opcionais": escrever `opcionai?s?`
 * casa "opcionais" mas não casa "opcional", que é a forma mais comum.
 */
const OPTIONAL = /[([\-–—]?\s*\bopcion(?:al|ais)\b\s*[)\]]?/i;

/** Unidades que aparecem coladas ao nome e valem extrair. */
const UNIT_WORDS = [
  "caixa", "caixas", "pacote", "pacotes", "resma", "resmas", "frasco", "frascos",
  "tubo", "tubos", "rolo", "rolos", "folha", "folhas", "metro", "metros",
  "par", "pares", "kit", "kits", "bloco", "blocos", "jogo", "jogos",
];

function titleishTrim(value: string): string {
  return value.replace(/\s+/g, " ").replace(/^[\s,;.:-]+|[\s,;.:-]+$/g, "").trim();
}

/**
 * Extrai "caixa com 12", "pacote c/ 100" etc. quando vêm entre parênteses ou
 * depois de vírgula. Só reconhece as unidades da lista acima -- não tenta
 * adivinhar.
 */
function extractUnit(name: string): { name: string; unit: string | null } {
  const parenthesized = name.match(/\(([^)]*)\)\s*$/);
  if (parenthesized) {
    const inner = titleishTrim(parenthesized[1]);
    const firstWord = inner.split(/\s+/)[0]?.toLowerCase() ?? "";
    if (UNIT_WORDS.includes(firstWord)) {
      return { name: titleishTrim(name.slice(0, parenthesized.index)), unit: inner };
    }
  }
  return { name, unit: null };
}

/**
 * Uma linha por item. Linhas vazias são ignoradas; linhas que sobram só com
 * pontuação também. Não tenta juntar linhas quebradas: preferir dois itens
 * separáveis a um item fundido errado.
 */
export function parseListItems(raw: string): ParsedItem[] {
  if (!raw?.trim()) return [];

  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(BULLET, ""))
    .map(titleishTrim)
    .filter((line) => line.length > 0 && /[a-zà-ú0-9]/i.test(line))
    .map((line) => {
      let working = line;
      let is_required = true;

      if (OPTIONAL.test(working)) {
        is_required = false;
        working = titleishTrim(working.replace(OPTIONAL, " "));
      }

      let quantity = 1;
      const qty = working.match(LEADING_QTY);
      if (qty) {
        const parsed = Number.parseInt(qty[1], 10);
        // 0 não é quantidade útil e números enormes quase sempre são parte do
        // nome ("Caderno 10 matérias" já foi tratado, mas "500 folhas" no
        // início é quantidade legítima) -- o teto alto é intencional.
        if (parsed >= 1 && parsed <= 999) {
          quantity = parsed;
          working = titleishTrim(qty[2]);
        }
      }

      const { name, unit } = extractUnit(working);

      return {
        name: titleishTrim(name) || titleishTrim(line),
        quantity,
        unit,
        brand: null,
        is_required,
        notes: null,
      };
    })
    .filter((item) => item.name.length > 0);
}
