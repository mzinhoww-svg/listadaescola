"use client";

import * as React from "react";

/**
 * Closes a Drawer/Modal when a useActionState result transitions to a
 * success state. Deliberately NOT a useEffect -- calling a state setter
 * synchronously inside an effect body is exactly what the
 * react-hooks/set-state-in-effect rule flags. React's own recommended fix
 * for "adjust state in response to a changed value" is to compare against
 * the previous value during render instead (see "You Might Not Need an
 * Effect"), which is what this does.
 */
export function useCloseOnActionSuccess(state: { success?: string } | undefined, setOpen: (open: boolean) => void) {
  const [prevState, setPrevState] = React.useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.success) setOpen(false);
  }
}
