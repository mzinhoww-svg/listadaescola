import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  errorText?: string;
  hideLabel?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, id, label, helperText, errorText, hideLabel = false, required, ...props },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;
    const describedBy = [errorText ? errorId : null, helperText ? helperId : null]
      .filter(Boolean)
      .join(" ") || undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className={cn(
            "text-sm font-medium text-neutral-900",
            hideLabel && "sr-only"
          )}
        >
          {label}
          {required && (
            <span className="text-danger-600" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>
        <input
          id={inputId}
          ref={ref}
          required={required}
          aria-required={required || undefined}
          aria-invalid={Boolean(errorText) || undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base text-neutral-900 placeholder:text-neutral-500",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
            "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400",
            errorText && "border-danger-600",
            className
          )}
          {...props}
        />
        {errorText ? (
          <p id={errorId} className="text-sm text-danger-600" role="alert">
            {errorText}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-sm text-neutral-600">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
