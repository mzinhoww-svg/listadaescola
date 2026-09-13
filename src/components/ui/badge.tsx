import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // Onda 2 P10: py-0.5 dava 2px reais de padding vertical contra o limiar de
  // 3.6px para texto de 12px, medido em 20 badges por página de resultados.
  // py-1 = 4px.
  "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium",
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
        // DESIGN.md "Named Accents" (acentos de papelaria) -- preenchimento
        // de badge só, nunca cor de texto corrido. `stationery-mint` é o
        // único dos três com sinal real hoje (disponibilidade de entrega/
        // retirada, stores.offers_delivery/offers_pickup); `amber`
        // ("item verificado") e `rose` ("economia") ficam sem variant
        // porque o produto ainda não tem o dado que sustentaria a
        // alegação -- não existe stores.is_verified nem comparação de
        // preço entre ofertas, e inventar o badge sem o dado seria
        // fabricar (RN-009).
        // stationery-mint não tem uma escala completa (é um único valor
        // nomeado, como whatsapp) -- neutral-800 no texto em vez de um
        // tom "-700" que não existe, mesmo par usado pra bg-whatsapp.
        "stationery-mint": "bg-stationery-mint/20 text-neutral-800 border border-stationery-mint/40",
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
