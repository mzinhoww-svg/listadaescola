import type { Metadata } from "next";
import Link from "next/link";

import { buildTeamWhatsappLink } from "@/lib/contact";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Para papelarias",
  description: "Como sua papelaria aparece para famílias procurando material escolar perto delas.",
  alternates: { canonical: "/para-papelarias" },
};

const CONTACT_HREF = buildTeamWhatsappLink(
  "Olá! Tenho uma papelaria e gostaria de saber como cadastrá-la no Listada Escola."
);

export default function ParaPapelariasPage() {
  return (
    <>
      <h1>Para papelarias</h1>
      <p>
        O Listada Escola conecta famílias que já sabem exatamente o que precisam comprar — a lista de
        material da escola do filho — com papelarias próximas que podem atender o pedido.
      </p>

      <h2>Como funciona para a sua papelaria</h2>
      <p>
        Quando uma família visualiza a lista de uma escola próxima à sua papelaria, ela pode pedir um
        orçamento diretamente pelo WhatsApp, com a lista completa já preenchida na mensagem — nome da
        escola, série, ano letivo e todos os itens. O Listada Escola nunca processa pagamento nem
        cobrança: o atendimento e a venda acontecem diretamente entre você e o cliente, do seu jeito.
      </p>

      <h2>Sem mensalidade escondida, sem checkout próprio</h2>
      <p>
        Não exigimos integração de estoque em tempo real nem processamos vendas — sua papelaria continua
        no controle total do atendimento, preço e forma de pagamento.
      </p>

      <h2>Quer cadastrar sua papelaria?</h2>
      <p>
        O cadastro é seu: você mesmo envia os dados da papelaria e nossa equipe confere antes de publicar. Se a
        sua papelaria já aparece no site, use o mesmo formulário para reivindicar a gestão do cadastro.
      </p>

      {/* Onda 6: até aqui esta página era o destino do CTA "Cadastrar minha
          papelaria" da Onda 2 e não tinha nenhum link de ação -- um beco sem
          saída. O botão abaixo é a saída. */}
      <p className="my-2 flex flex-wrap items-center gap-3">
        <Button asChild size="lg">
          <Link href="/cadastrar-papelaria">Cadastrar minha papelaria</Link>
        </Button>
        <a
          href={CONTACT_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary-700 hover:underline"
        >
          Prefiro falar com alguém pelo WhatsApp
        </a>
      </p>

      <p>
        O cadastro exige uma conta no Listada Escola — é ela que dá acesso à área da papelaria, onde você edita
        horário, endereço, WhatsApp e serviços e acompanha os pedidos de orçamento que chegaram por aqui.
      </p>
    </>
  );
}
