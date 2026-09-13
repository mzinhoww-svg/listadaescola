import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

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
      <p>
        Quando é a própria escola que publica, o caminho é mais curto: um responsável verificado pela
        nossa equipe publica a lista direto, sem fila.
      </p>

      {/*
        Onda 7: até aqui esta página era um beco sem saída -- explicava tudo
        e o único link de ação apontava para /sugerir-escola, que é o
        formulário de "escola que não existe na base". Uma escola que já
        está no INEP (as 2.722 de MT estão) não tem o que sugerir; ela
        precisa é de acesso ao próprio perfil.
      */}
      <h2>Assuma o perfil da sua escola</h2>
      <p>
        Se você trabalha na escola, pode pedir acesso ao perfil dela. Não existe verificação automática:
        uma pessoa da nossa equipe confere sua declaração com os dados oficiais e com o contato da
        escola antes de liberar. Depois de aprovado, você mantém descrição, contatos e fotos, e publica
        as listas de material sem passar pela moderação.
      </p>
      <p>
        Nome, código INEP e endereço continuam vindo da fonte oficial — nem a escola nem um usuário
        comum editam esses campos.
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/reivindicar-escola">Reivindicar minha escola</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/minha-escola">Já pedi — acompanhar solicitação</Link>
        </Button>
      </div>

      <h2>Quer corrigir uma informação oficial?</h2>
      <p>
        Dados de origem do INEP não são editáveis nem pela escola. Se algo estiver errado na fonte, ou se
        a escola não estiver na base,{" "}
        <Link href="/sugerir-escola" className="font-medium text-primary-700 hover:underline">
          use o formulário de sugestão
        </Link>{" "}
        e nossa equipe avalia a correção.
      </p>
    </>
  );
}
