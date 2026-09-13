"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { recordAnalyticsEvent } from "@/lib/analytics/record-event";
import { continueLocalDraft } from "@/lib/contributions/continue-local-draft";
import { loadLocalDraft, type LocalDraft } from "@/lib/contributions/local-draft";
import { NewSubmissionWizard } from "@/components/contributions/new-submission-wizard";
import { LoadingState } from "@/components/ui/loading-state";

/**
 * CTA da home pro rascunho anônimo (sub-projeto papelaria #1,
 * docs/superpowers/specs/2026-09-13-cta-home-rascunho-anonimo-design.md).
 * Link de texto, não botão primário -- não compete com a busca acima. Ao
 * montar já autenticado com um rascunho local pendente (voltando do
 * login/cadastro), continua sozinho em vez de mostrar o link de novo.
 */
export function HomeListRequestCta({ isAuthenticated }: { isAuthenticated: boolean }) {
  const router = useRouter();
  // Lido uma única vez, na primeira renderização (lazy initializer, não
  // efeito) -- localStorage não existe durante SSR, mas loadLocalDraft já
  // degrada pra null nesse caso; a leitura real acontece na montagem no
  // cliente. Nunca reatribuído depois, por isso o setter é descartado.
  const [initialDraft] = React.useState<LocalDraft | null>(() => (isAuthenticated ? loadLocalDraft() : null));
  const [mode, setMode] = React.useState<"link" | "wizard" | "resuming">(initialDraft ? "resuming" : "link");
  const [resumeError, setResumeError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!initialDraft) return;
    let cancelled = false;
    void continueLocalDraft(initialDraft, router).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setResumeError(result.error ?? "Não foi possível continuar seu rascunho.");
        setMode("wizard");
      }
    });
    return () => {
      cancelled = true;
    };
    // initialDraft é fixo pro ciclo de vida deste componente (state sem
    // setter usado) e router é estável no App Router -- só queremos
    // disparar isto uma vez, na montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (mode === "resuming") {
    return <LoadingState label="Continuando seu rascunho..." />;
  }

  if (mode === "wizard") {
    return (
      <div className="flex flex-col gap-3">
        {resumeError && (
          <p role="alert" className="text-sm text-danger-600">
            {resumeError}
          </p>
        )}
        <NewSubmissionWizard allowAnonymous isAuthenticated={isAuthenticated} />
      </div>
    );
  }

  return (
    // <button>, não <Link>: não navega, só revela o wizard abaixo -- mesma
    // cor/peso dos links de texto do site (ex. como-funciona.tsx), só que
    // com semântica de ação em vez de navegação.
    <button
      type="button"
      className="w-fit rounded text-sm font-medium text-primary-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
      onClick={() => {
        void recordAnalyticsEvent({ eventType: "home_list_request_click" });
        setMode("wizard");
      }}
    >
      Não achou a lista da sua escola? Peça aqui
    </button>
  );
}
