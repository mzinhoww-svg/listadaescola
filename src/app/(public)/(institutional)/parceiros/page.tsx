import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parceiros",
  description: "Parceiros de e-commerce e papelarias locais do Listada Escola.",
  alternates: { canonical: "/parceiros" },
};

export default function ParceirosPage() {
  return (
    <>
      <h1>Parceiros</h1>
      <p>
        A partir de uma lista escolar, você pode comprar de duas formas: com um parceiro de e-commerce
        ou com uma papelaria local.
      </p>

      <h2>Parceiros de e-commerce</h2>
      <p>
        Exibimos ofertas de parceiros de e-commerce ativos para os itens de cada lista. Ao clicar,
        você é levado direto para a oferta no site do parceiro — o Listada Escola nunca processa o
        pagamento, apenas indica onde comprar.
      </p>

      <h2>Papelarias locais</h2>
      <p>
        Também mostramos papelarias ativas próximas à escola, com um botão para pedir orçamento
        diretamente pelo WhatsApp, com a lista já pré-preenchida na mensagem.
      </p>

      <h2>Quer ser um parceiro?</h2>
      <p>
        Se você representa um e-commerce ou uma rede de papelarias e quer aparecer no Listada Escola,
        entre em contato com nossa equipe para saber mais.
      </p>
    </>
  );
}
