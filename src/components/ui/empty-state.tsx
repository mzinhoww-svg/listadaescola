import * as React from "react";
import { type LucideIcon, Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 px-6 py-12 text-center",
        className
      )}
      {...props}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-neutral-100">
        <Icon className="size-6 text-neutral-400" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-neutral-900">{title}</p>
        {description && <p className="text-sm text-neutral-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export { EmptyState };
