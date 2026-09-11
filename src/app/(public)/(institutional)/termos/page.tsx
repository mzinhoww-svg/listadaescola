import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Termos de uso do Listada Escola.",
  alternates: { canonical: "/termos" },
};

export default function TermosPage() {
  return (
    <>
      <h1>Termos de uso</h1>
      <p>Última atualização: 2026.</p>
      <p>
        Ao usar o Listada Escola, você concorda com estes termos. Se não concordar, não utilize a
        plataforma.
      </p>

      <h2>O que é o Listada Escola</h2>
      <p>
        Uma plataforma de descoberta de escolas e listas de material escolar, com escopo inicial em
        Mato Grosso. Escolas são carregadas a partir de dados públicos do INEP; listas e sugestões de
        escola enviadas por usuários passam por moderação antes de ficarem públicas.
      </p>

      <h2>Contas de usuário</h2>
      <ul>
        <li>Você é responsável por manter a confidencialidade da sua senha.</li>
        <li>As informações que você fornecer devem ser verdadeiras.</li>
        <li>
          Contribuições (listas enviadas, sugestões de escola, avaliações) ficam vinculadas à sua conta
          e passam por revisão antes de virar conteúdo público.
        </li>
      </ul>

      <h2>Conteúdo enviado por você</h2>
      <p>
        Ao enviar uma lista, sugestão ou avaliação, você declara que tem o direito de compartilhar esse
        conteúdo e concorda que ele pode ser revisado, editado para correção ou recusado pela nossa
        moderação.
      </p>

      <h2>O que o Listada Escola não faz</h2>
      <p>
        Não processamos pagamento, não operamos checkout, PIX, cartão ou boleto, e não temos carrinho de
        compras próprio. A compra de material escolar acontece diretamente com o parceiro de e-commerce
        ou a papelaria, fora da nossa plataforma. Não garantimos preço, disponibilidade ou estoque de
        nenhum parceiro ou papelaria.
      </p>

      <h2>Uso aceitável</h2>
      <p>
        Não é permitido usar a plataforma para enviar conteúdo falso, ofensivo ou que viole direitos de
        terceiros, nem tentar acessar dados ou contas de outros usuários.
      </p>

      <h2>Alterações</h2>
      <p>
        Podemos atualizar estes termos periodicamente. O uso continuado da plataforma após uma
        atualização representa aceitação dos novos termos.
      </p>
    </>
  );
}
