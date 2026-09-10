"use client";

/**
 * Plumbing compartilhada por Modal, Drawer e BottomSheet — os três são a
 * mesma primitiva acessível do Radix (foco preso, Escape fecha, overlay
 * clicável, aria-modal correto) só com posicionamento/CSS diferentes.
 */
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const DialogRoot = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;
const DialogTitle = DialogPrimitive.Title;
const DialogDescription = DialogPrimitive.Description;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-neutral-900/50 transition-opacity",
      "data-[state=open]:opacity-100 data-[state=closed]:opacity-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

function DialogCloseButton({ label = "Fechar" }: { label?: string }) {
  return (
    <DialogPrimitive.Close
      className={cn(
        "absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-lg text-neutral-500",
        "hover:bg-neutral-100 hover:text-neutral-900",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
      )}
      aria-label={label}
    >
      <X className="size-5" aria-hidden="true" />
    </DialogPrimitive.Close>
  );
}

export {
  DialogRoot,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTitle,
  DialogDescription,
  DialogCloseButton,
};
