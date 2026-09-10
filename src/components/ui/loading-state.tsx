import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}

/** Spinner com anúncio para leitor de tela. Use `Skeleton` quando já souber o layout do conteúdo. */
function LoadingState({ label = "Carregando…", className, ...props }: LoadingStateProps) {
  return (
    <div
      role="status"
      className={cn("flex flex-col items-center justify-center gap-2 py-10 text-neutral-500", className)}
      {...props}
    >
      <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-neutral-200", className)}
      {...props}
    />
  );
}

export { LoadingState, Skeleton };
