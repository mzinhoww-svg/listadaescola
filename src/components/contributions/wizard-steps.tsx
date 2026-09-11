import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = [
  { key: "escola", label: "Escola" },
  { key: "serie", label: "Ano/Série" },
  { key: "itens", label: "Itens" },
  { key: "anexo", label: "Anexo" },
  { key: "revisao", label: "Revisão" },
] as const;

export type WizardStepKey = (typeof STEPS)[number]["key"];

/**
 * PRD wireframes de contribuição (Grupo B, #11-15) tratam "Ano/série" como
 * UMA tela, não duas -- por isso 5 etapas aqui, não 6. Confirmação (#16)
 * é o estado terminal, não faz parte da contagem de progresso.
 */
export function WizardSteps({ current }: { current: WizardStepKey }) {
  const currentIndex = STEPS.findIndex((step) => step.key === current);

  return (
    <nav aria-label="Progresso do envio" className="mb-6">
      <ol className="flex items-center gap-1 sm:gap-2">
        {STEPS.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <li key={step.key} className="flex flex-1 items-center gap-1 sm:gap-2">
              <div className="flex flex-1 flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    isComplete && "bg-primary-600 text-white",
                    isCurrent && "border-2 border-primary-600 bg-white text-primary-700",
                    !isComplete && !isCurrent && "bg-neutral-100 text-neutral-400"
                  )}
                  aria-hidden="true"
                >
                  {isComplete ? <Check className="size-4" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "hidden text-center text-xs font-medium sm:block",
                    isCurrent ? "text-primary-700" : "text-neutral-500"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={cn("h-0.5 flex-1", isComplete ? "bg-primary-600" : "bg-neutral-200")} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        Etapa {currentIndex + 1} de {STEPS.length}: {STEPS[currentIndex]?.label}
      </p>
    </nav>
  );
}
