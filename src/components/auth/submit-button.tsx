"use client";

import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

/** Wraps Button with useFormStatus so it shows the existing loading spinner
 * while its enclosing form's Server Action is pending. Must be a child of
 * the <form> it submits — useFormStatus only sees its own form. */
export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...props}>
      {children}
    </Button>
  );
}
