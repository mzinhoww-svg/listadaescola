import { redirect } from "next/navigation";

import { getOwnSubmissionDetail } from "@/lib/contributions/queries";

/**
 * Ownership + existence gate shared by every step under /enviar-lista/[id].
 * getOwnSubmissionDetail already scopes to `submitted_by = auth.uid()`
 * (SEC-002 IDOR) -- anything else (wrong id, someone else's submission)
 * collapses to the same "not found" redirect, never a distinguishable
 * error. Editable-status gating (DRAFT/NEEDS_CORRECTION vs. already
 * submitted) is per-step, not here -- confirmacao must stay reachable
 * regardless of status.
 */
export default async function SubmissionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const submission = await getOwnSubmissionDetail(id);
  if (!submission) {
    redirect("/enviar-lista");
  }

  return <>{children}</>;
}
