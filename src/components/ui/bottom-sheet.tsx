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

const BottomSheetContent = React.forwardRef<
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
        "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lg",
        "transition-transform data-[state=open]:translate-y-0 data-[state=closed]:translate-y-full",
        className
      )}
      {...props}
    >
      <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-300" aria-hidden="true" />
      <DialogTitle className="pr-8 text-lg font-semibold text-neutral-900">
        {title}
      </DialogTitle>
      {description && (
        <DialogDescription className="mt-1 text-sm text-neutral-500">
          {description}
        </DialogDescription>
      )}
      <DialogCloseButton />
      <div className="mt-4 max-h-[60vh] overflow-y-auto">{children}</div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
BottomSheetContent.displayName = "BottomSheetContent";

/** BottomSheet — painel inferior (uso típico: mobile). Mesma base do Drawer. */
function BottomSheet({ children, ...props }: React.ComponentProps<typeof DialogRoot>) {
  return <DialogRoot {...props}>{children}</DialogRoot>;
}

export { BottomSheet, DialogTrigger as BottomSheetTrigger, BottomSheetContent };
