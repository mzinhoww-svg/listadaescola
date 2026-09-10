"use client";

/**
 * Store mínimo para disparar toasts de qualquer lugar (componente, handler,
 * util), não só de dentro de um componente React — por isso é um store a
 * nível de módulo com listeners, não apenas um useState local.
 */
import * as React from "react";

export type ToastVariant = "default" | "success" | "danger";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

type ToastInput = Omit<ToastItem, "id">;

let toasts: ToastItem[] = [];
const listeners = new Set<(toasts: ToastItem[]) => void>();

function emit() {
  for (const listener of listeners) listener(toasts);
}

function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function toast(input: ToastInput) {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, duration: 5000, ...input }];
  emit();
  return id;
}

export function useToast() {
  const [state, setState] = React.useState<ToastItem[]>(toasts);

  React.useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return { toasts: state, toast, dismiss };
}
