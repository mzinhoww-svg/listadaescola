import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Matches public.slugify() (supabase/migrations) -- used client-side only for building links to already-slugified rows, never to generate the canonical slug itself. */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(value);
}

const TITLE_CASE_LOWERCASE = new Set(["de", "da", "do", "das", "dos", "e"]);
const TITLE_CASE_UPPERCASE = new Set([
  "ee", "em", "emeb", "emei", "cei", "cmei", "apae", "ie",
]);

/** Display-only transform for INEP's all-caps school/address names -- never
 * writes back to stored data (schools is master/census data, never edited
 * or fabricated, CLAUDE.md). Keeps a short list of known school-network
 * acronyms uppercase and lowercases Portuguese connector words, so census
 * text reads like the rest of the product's own copy instead of a data
 * export. */
export function toDisplayCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      if (!word) return word;
      if (TITLE_CASE_UPPERCASE.has(word)) return word.toUpperCase();
      if (index > 0 && TITLE_CASE_LOWERCASE.has(word)) return word;
      return word[0].toUpperCase() + word.slice(1);
    })
    .join(" ");
}
