import Link from "next/link";
import { School } from "lucide-react";

/**
 * Onda 7 -- o caminho de entrada do gestor, no lugar onde ele
 * inevitavelmente está: o perfil público da própria escola.
 *
 * Discreto de propósito. O público desta página é a família procurando a
 * lista; a diretora é a minoria dos acessos e chega aqui uma vez. Um bloco
 * grande roubaria atenção do que 99% das visitas vieram fazer.
 *
 * Não consulta `school_claims`: seria uma ida ao banco em toda visita de
 * uma página pública e quente para um estado que só interessa a quem já
 * pediu -- e a própria `/reivindicar-escola` já mostra "sua solicitação
 * está em análise" quando é o caso. Visitante anônimo é levado ao login
 * pelo proxy (`PROTECTED_PREFIXES`), com `next` de volta para cá.
 */
export function ClaimSchoolCta({ schoolId }: { schoolId: string }) {
  return (
    <section className="mt-10 border-t border-neutral-200 pt-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-600">
        <School className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
        É a sua escola?
        <Link
          href={`/reivindicar-escola?escola=${schoolId}`}
          className="font-medium text-primary-700 hover:underline"
        >
          Peça acesso para manter o perfil e publicar as listas
        </Link>
      </p>
    </section>
  );
}
