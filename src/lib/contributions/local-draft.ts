import type { SchoolSearchOption } from "@/lib/contributions/actions";

export interface LocalDraftItem {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  brand: string | null;
  isRequired: boolean;
}

export interface LocalDraft {
  school: SchoolSearchOption;
  educationLevel: string;
  seriesName: string;
  schoolYear: number;
  items: LocalDraftItem[];
  savedAt: string;
}

const STORAGE_KEY = "listada-rascunho-lista";
// Chute inicial (spec 2026-09-13-cta-home-rascunho-anonimo-design.md) --
// ajustável sem redesenho.
const EXPIRY_DAYS = 7;

function isValidDraftShape(value: unknown): value is LocalDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<LocalDraft>;
  return (
    typeof draft.savedAt === "string" &&
    !!draft.school &&
    typeof draft.school === "object" &&
    typeof (draft.school as Partial<SchoolSearchOption>).id === "string" &&
    Array.isArray(draft.items)
  );
}

function isExpired(savedAt: string): boolean {
  const savedMs = Date.parse(savedAt);
  if (Number.isNaN(savedMs)) return true;
  return Date.now() - savedMs > EXPIRY_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * `null` para "ausente", "corrompido" ou "expirado" -- os três casos
 * degradam do mesmo jeito (wizard começa do zero, sem aviso de expiração
 * que ninguém pediu). `localStorage` pode lançar em aba anônima com bloqueio
 * de storage; nunca deve quebrar a tela por isso.
 */
export function loadLocalDraft(): LocalDraft | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isValidDraftShape(parsed)) {
      clearLocalDraft();
      return null;
    }
    if (isExpired(parsed.savedAt)) {
      clearLocalDraft();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalDraft(draft: LocalDraft): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Quota cheia ou storage bloqueado -- degrada silenciosamente. O estado
    // em memória do componente continua valendo pela sessão atual; só a
    // sobrevivência a um reload/nova aba é que se perde.
  }
}

export function clearLocalDraft(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore -- mesma degradação acima.
  }
}
