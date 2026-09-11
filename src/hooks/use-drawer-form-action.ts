"use client";

import * as React from "react";

/**
 * Drives a <form> living inside a Drawer/Modal (Radix Dialog Portal)
 * without relying on useActionState's native `action={formAction}`
 * binding -- confirmed empirically (Prompt 13) that binding only ever
 * fires its Server Action once per mounted form when the form lives
 * inside a Portal: a real second click, and even a programmatic
 * `form.requestSubmit()`, on the same mounted form both produce zero
 * network requests on the second attempt, whether the first one errored
 * or succeeded. A plain onSubmit handler that calls the action directly,
 * tracked via useTransition, fires reliably on every submission instead.
 * Every admin Drawer form uses this now, not just the one that first
 * surfaced the bug -- they all shared the same broken pattern, just
 * never had a test exercise "submit invalid, fix, resubmit."
 */
export function useDrawerFormAction<State extends { error?: string; success?: string }>(
  action: (prevState: State, formData: FormData) => Promise<State>,
  initialState: State,
  onSuccess?: () => void
) {
  const [state, setState] = React.useState<State>(initialState);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await action(state, formData);
      setState(result);
      if (result.success) onSuccess?.();
    });
  }

  function resetState() {
    setState(initialState);
  }

  return { state, pending, handleSubmit, resetState };
}
