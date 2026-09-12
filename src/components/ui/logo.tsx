import { cn } from "@/lib/utils";

export interface LogoProps {
  /** Esconde o wordmark, deixando só a marca (ex.: header muito estreito). */
  markOnly?: boolean;
  className?: string;
}

/**
 * Marca do Listada Escola, conforme o artefato `logo_listada_escola` do
 * export oficial do Stitch: quadrado arredondado azul-ardósia com as
 * linhas de uma checklist em branco e um ponto periwinkle de acento,
 * seguido do wordmark bicolor "listada" + "escola".
 *
 * Desenhado como SVG inline (não PNG) para escalar sem perda, herdar as
 * cores dos tokens do design system e não custar um request extra.
 */
function Logo({ markOnly = false, className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* Decorativo: o nome acessível vem do wordmark visível ao lado ou,
          quando markOnly, do aria-label de quem envolve a marca (o Link do
          header, por exemplo) -- evita anúncio duplicado em leitor de tela. */}
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="9" className="fill-primary-600" />
        <rect x="7" y="9" width="18" height="3" rx="1.5" fill="#ffffff" />
        <rect x="7" y="15" width="13" height="3" rx="1.5" fill="#ffffff" />
        <rect x="7" y="21" width="9" height="3" rx="1.5" fill="#ffffff" />
        <circle cx="22.5" cy="22.5" r="3.2" className="fill-secondary-300" />
      </svg>
      {!markOnly && (
        <span className="font-display text-lg font-bold tracking-tight text-neutral-900">
          listada<span className="text-primary-600">escola</span>
        </span>
      )}
    </span>
  );
}

export { Logo };
