"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  DialogRoot,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
  DialogCloseButton,
} from "@/components/ui/dialog-primitives";
import * as DialogPrimitive from "@radix-ui/react-dialog";

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    title: string;
    description?: string;
  }
>(({ className, title, description, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
        "rounded-2xl bg-white p-5 shadow-lg",
        "transition-all data-[state=open]:scale-100 data-[state=open]:opacity-100 data-[state=closed]:scale-95 data-[state=closed]:opacity-0",
        className
      )}
      {...props}
    >
      <DialogTitle className="pr-8 text-lg font-semibold text-neutral-900">
        {title}
      </DialogTitle>
      {description && (
        <DialogDescription className="mt-1 text-sm text-neutral-500">
          {description}
        </DialogDescription>
      )}
      <DialogCloseButton />
      <div className="mt-4">{children}</div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
ModalContent.displayName = "ModalContent";

/** Modal — diálogo central, foco preso, fecha com Escape/overlay/X. */
function Modal({ children, ...props }: React.ComponentProps<typeof DialogRoot>) {
  return <DialogRoot {...props}>{children}</DialogRoot>;
}

export { Modal, DialogTrigger as ModalTrigger, ModalContent };
