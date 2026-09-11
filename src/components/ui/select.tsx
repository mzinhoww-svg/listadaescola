import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hideLabel?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, id, label, hideLabel = false, children, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className={cn("text-sm font-medium text-neutral-900", hideLabel && "sr-only")}>
          {label}
        </label>
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              "h-11 w-full appearance-none rounded-lg border border-neutral-300 bg-white px-3 pr-9 text-base text-neutral-900",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
              "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500"
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
