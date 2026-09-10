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

const DrawerContent = React.forwardRef<
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
        "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-white p-5 shadow-lg",
        "transition-transform data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full",
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
      <div className="mt-4 flex-1 overflow-y-auto">{children}</div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DrawerContent.displayName = "DrawerContent";

/** Drawer — painel lateral (uso típico: desktop). Mesma base do BottomSheet. */
function Drawer({ children, ...props }: React.ComponentProps<typeof DialogRoot>) {
  return <DialogRoot {...props}>{children}</DialogRoot>;
}

export { Drawer, DialogTrigger as DrawerTrigger, DrawerContent };
