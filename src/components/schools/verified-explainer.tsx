import { BadgeCheck } from "lucide-react";

/**
 * Onda 9 -- o selo "Verificada" dito na tela.
 *
 * O selo existe desde o Prompt 06, entra no `organic_score` com peso
 * próprio (`weight_quality` em search_schools) e é renderizado no card de
 * resultados e no topo do perfil -- e em nenhum lugar o visitante tem como
 * saber o que ele afirma. Um selo verde ao lado do nome de uma escola real,
 * sem legenda, é lido como "escola boa". Não é isso que o dado diz.
 *
 * O que ele diz, verificado no código e não presumido:
 *
 * - `school_profiles.is_verified` só é escrito por admin, por
 *   `admin_update_school_profile()` (gate `is_admin()`,
 *   20260911200000_security_audit_fixes.sql:475) ou pela policy
 *   `school_profiles_admin_all`.
 * - O gestor de escola da Onda 7 NÃO consegue se autoconceder o selo: o
 *   trigger `school_profiles_protect_admin_columns()`
 *   (20260913040000_school_claim_and_publish.sql:570) força `is_verified`
 *   de volta a `false`/`old.is_verified` em toda escrita dele.
 * - **`approve_school_claim()` não toca em `is_verified`.** Reivindicar a
 *   escola e ser aprovado cria o vínculo em `school_managers` e promove o
 *   papel -- e só. Ou seja: selo e reivindicação são duas coisas
 *   independentes, e escrever "esta escola reivindicou o perfil e nós
 *   conferimos" seria afirmar um vínculo que o banco não sustenta.
 *
 * Por isso o texto abaixo diz exatamente o que é verdade hoje (a equipe
 * revisou o perfil) e nega explicitamente a leitura errada mais provável
 * (que seja nota de qualidade). "Contatos e site" são literalmente os
 * campos que `admin_update_school_profile()` escreve junto com o selo --
 * endereço e nome vêm do INEP e ninguém edita, então prometer que foram
 * "conferidos" seria dizer mais do que o ato do admin cobre.
 *
 * Se o responsável decidir que o selo passa a significar "reivindicada e
 * aprovada", o lugar de mudar é `approve_school_claim()` -- e então este
 * texto.
 *
 * Só renderiza quando o selo existe. Explicar um selo ausente transformaria
 * a ausência em sinal negativo, que é a mesma classe de erro que o estado
 * zero das avaliações.
 *
 * Contraste medido no navegador: neutral-700 sobre success-50 = 8.84:1.
 */
export function VerifiedExplainer() {
  return (
    <p className="flex max-w-[65ch] items-start gap-2 rounded-lg bg-success-50 p-3 text-sm text-neutral-700">
      <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success-700" aria-hidden="true" />
      <span>
        <strong className="font-medium text-neutral-900">Verificada</strong> quer dizer que a equipe do Listada
        revisou as informações deste perfil, como os contatos e o site. Não é uma avaliação da qualidade do
        ensino.
      </span>
    </p>
  );
}
