export { EDUCATION_LEVELS } from "@/lib/schools/search-schools";

/** Mirrors the `submissions` bucket config (storage.sql) exactly -- the
 * bucket itself is the authoritative enforcement, this is only for
 * client-side UX (reject an obviously-bad file before it round-trips). */
export const ALLOWED_ATTACHMENT_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

const CURRENT_YEAR = new Date().getFullYear();
/** Contributions are always about the current or next school year -- a
 * community member submitting a list has no reason to backdate one. */
export const SCHOOL_YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR + 1] as const;

export const EDITABLE_SUBMISSION_STATUSES = ["DRAFT", "NEEDS_CORRECTION"] as const;
