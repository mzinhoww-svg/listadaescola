import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Para papelarias",
  description: "Como sua papelaria aparece para famílias procurando material escolar perto delas.",
  alternates: { canonical: "/para-papelarias" },
};

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
        O cadastro de papelarias parceiras é feito pela nossa equipe. Entre em contato para saber mais
        sobre como incluir sua papelaria no Listada Escola.
      </p>
    </>
  );
}
