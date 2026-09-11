"use client";

import * as React from "react";

/**
 * useSyncExternalStore (not useState+useEffect): matchMedia is exactly
 * the kind of external, subscribable browser store this API is for --
 * avoids the extra post-mount render a manual effect would need, and the
 * server snapshot (`false`) is only ever used before hydration, which is
 * fine here since every caller only reads this once the user interacts
 * (opens a sheet).
 */
export function useMediaQuery(query: string): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", onChange);
      return () => mediaQueryList.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
