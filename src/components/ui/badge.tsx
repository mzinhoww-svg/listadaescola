import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-neutral-100 text-neutral-700",
        // Colored variants (everything but neutral) carry a tinted border:
        // their pale -50 fill measures almost the same lightness as the
        // warm paper canvas/cards, so without an edge the chip shape
        // scannability badges exist for disappears against the background.
        primary: "bg-primary-50 text-primary-700 border border-primary-500/20",
        secondary: "bg-secondary-100 text-secondary-800 border border-secondary-500/25",
        success: "bg-success-50 text-success-700 border border-success-500/25",
        warning: "bg-warning-50 text-warning-700 border border-warning-500/25",
        danger: "bg-danger-50 text-danger-700 border border-danger-500/25",
        info: "bg-info-50 text-info-700 border border-info-500/25",
        sponsored: "bg-sponsored-50 text-sponsored-700 border border-sponsored-500/25",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
