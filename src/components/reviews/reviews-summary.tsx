import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ApprovedReview } from "@/lib/reviews/queries";
import { cn } from "@/lib/utils";

export interface ReviewsSummaryProps {
  reviews: ApprovedReview[];
}

/**
 * Onda 9 -- o estado zero das avaliações, que hoje é o estado real: o banco
 * de produção tem 0 avaliações em 2.722 escolas.
 *
 * A regra que governa este bloco é a mesma de "nunca fabricar distância":
 * **ausência de avaliação não é nota**. O card de resultados e esta página
 * já protegiam o número (`review_count > 0` / `reviews.length > 0`), então
 * nenhuma tela chegou a exibir "0,0 estrelas" -- o problema não era o número
 * inventado, era a frase curta e cinza "Nenhuma avaliação publicada ainda",
 * que num perfil de escola real lê como veredito e não como falta de dado.
 * A correção é texto, nunca número: dizer explicitamente o que a ausência
 * significa, o que ela NÃO significa, e o que aparecerá ali quando houver
 * conteúdo (DESIGN.md, "A Regra do Estado Honesto").
 *
 * Sem CTA próprio: o formulário de avaliação (ou o link de entrar) vem
 * imediatamente abaixo na página. Um botão aqui seria o segundo pedido em
 * dez centímetros de tela -- e a onda é sobre confiança, não sobre pressão.
 */
export function ReviewsEmptyState() {
  return (
    <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4">
      <p className="flex items-center gap-2 font-medium text-neutral-900">
        <Star className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
        Ainda não há avaliações desta escola
      </p>
      <p className="mt-1.5 max-w-[65ch] text-sm text-neutral-600">
        Isso não é uma nota baixa: quer dizer que ninguém avaliou esta escola no Listada até agora. Quando
        famílias avaliarem, a nota média e os comentários aprovados aparecem aqui.
      </p>
      <p className="mt-1.5 max-w-[65ch] text-sm text-neutral-500">
        Toda avaliação passa por moderação antes de ser publicada.
      </p>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 text-warning-500" aria-label={`Nota ${rating} de 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn("size-4", index < rating ? "fill-current" : "text-neutral-300")}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/**
 * A nota média e os comentários aprovados. Só é montado com `reviews.length
 * > 0` -- o estado vazio é `ReviewsEmptyState` acima, deliberadamente um
 * componente separado e não um `if` aqui dentro, porque as duas telas não
 * têm nada em comum além do assunto.
 *
 * Sem nome/avatar de quem avaliou: `profiles` não tem policy de leitura
 * pública (só profiles_select_own/admin), então nem haveria como resolver um
 * -- ver o comentário de `getApprovedReviews`.
 */
export function ReviewsSummary({ reviews }: ReviewsSummaryProps) {
  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  return (
    <>
      <Badge variant="neutral" className="mb-4 w-fit">
        <Star className="size-3" aria-hidden="true" />
        {average.toFixed(1)} ({reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"})
      </Badge>
      <ul className="mb-6 flex flex-col gap-3">
        {reviews.map((review) => (
          <li key={review.id} className="rounded-xl border border-neutral-200 p-4">
            <Stars rating={review.rating} />
            {review.comment && <p className="mt-2 text-sm text-neutral-700">{review.comment}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}
