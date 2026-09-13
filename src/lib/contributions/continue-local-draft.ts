import { materializeLocalDraftAction } from "@/lib/contributions/actions";
import { clearLocalDraft, type LocalDraft } from "@/lib/contributions/local-draft";

export interface ContinueLocalDraftResult {
  ok: boolean;
  error?: string;
}

/**
 * Shared by the two places that finish an anonymous draft once the visitor
 * is authenticated: the wizard's own "Continuar" (already logged in) and
 * the home CTA's auto-resume effect (just came back from login/cadastro).
 * `localStorage` is only cleared after `materializeLocalDraftAction`
 * confirms success -- a network/RLS error must never cost the draft.
 */
export async function continueLocalDraft(
  draft: LocalDraft,
  router: { push: (href: string) => void }
): Promise<ContinueLocalDraftResult> {
  const result = await materializeLocalDraftAction(draft);
  if (!result.ok || !result.submissionId) {
    return { ok: false, error: result.error ?? "Não foi possível continuar seu envio." };
  }

  clearLocalDraft();
  router.push(`/enviar-lista/${result.submissionId}/anexo${result.collided ? "?rascunho=atualizado" : ""}`);
  return { ok: true };
}
