import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Para escolas",
  description: "Como o Listada Escola apresenta sua escola e suas listas de material escolar às famílias.",
  alternates: { canonical: "/para-escolas" },
};

export default function ParaEscolasPage() {
  return (
    <>
      <h1>Para escolas</h1>
      <p>
        Sua escola já aparece no Listada Escola se estiver ativa na base pública do INEP para Mato
        Grosso. A partir daí, ajudamos famílias a encontrar sua escola e a lista de material certa para
        cada série e ano letivo.
      </p>

      <h2>Dados oficiais, sempre atualizados</h2>
      <p>
        Nome, endereço, localização e demais dados de origem do INEP são mantidos separados do conteúdo
        editorial (fotos, descrição, contato, redes sociais) — atualizações de identidade da escola vêm
        sempre da fonte oficial, nunca de edição direta de um usuário comum.
      </p>

      <h2>Como uma lista da sua escola é publicada</h2>
      <p>
        Qualquer pessoa autenticada pode enviar a lista de material de uma série/ano letivo da sua
        escola. Cada envio passa pela nossa moderação — comparando o documento original anexado com os
        itens digitados — antes de ficar visível publicamente.
      </p>

      <h2>Quer corrigir alguma informação?</h2>
      <p>
        Se algo no perfil da sua escola estiver incorreto ou desatualizado,{" "}
        <Link href="/sugerir-escola" className="font-medium text-primary-700 hover:underline">
          entre em contato através do formulário de sugestão
        </Link>{" "}
        e nossa equipe avalia a correção.
      </p>
    </>
  );
}
