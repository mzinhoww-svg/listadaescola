import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como o Listada Escola trata os dados dos usuários.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacidadePage() {
  return (
    <>
      <h1>Política de privacidade</h1>
      <p>Última atualização: 2026.</p>

      <h2>Quais dados coletamos</h2>
      <ul>
        <li>
          <strong>Conta:</strong> nome e e-mail, quando você cria uma conta para contribuir com listas,
          sugestões ou avaliações.
        </li>
        <li>
          <strong>Localização:</strong> CEP, cidade ou coordenadas de geolocalização que você informa
          para buscar escolas próximas — nunca coletamos sua localização sem essa ação explícita.
        </li>
        <li>
          <strong>Uso da plataforma:</strong> registramos buscas, visualizações de escola/lista e
          cliques em ofertas de parceiros/WhatsApp, para entender o que funciona e melhorar o produto.
          Esses registros são processados no servidor e nunca ficam acessíveis diretamente pelo
          navegador.
        </li>
        <li>
          <strong>Anexos de contribuição:</strong> um documento (PDF/foto) que você anexa ao enviar uma
          lista, guardado de forma privada até a moderação aprovar o conteúdo.
        </li>
      </ul>

      <h2>Como usamos seus dados</h2>
      <p>
        Para operar a busca de escolas e listas, moderar contribuições, e gerar métricas agregadas de
        uso do produto. Não vendemos seus dados pessoais a terceiros.
      </p>

      <h2>Com quem compartilhamos</h2>
      <p>
        Não compartilhamos seus dados de conta com parceiros de e-commerce ou papelarias. Ao clicar em
        uma oferta de parceiro ou pedir orçamento por WhatsApp, você é redirecionado para fora da nossa
        plataforma — a partir daí, o tratamento de dados passa a ser do destino que você escolheu
        acessar.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode solicitar acesso, correção ou exclusão dos seus dados de conta a qualquer momento
        entrando em contato conosco.
      </p>

      <h2>Cookies</h2>
      <p>
        Veja nossa{" "}
        <a href="/cookies" className="font-medium text-primary-700 hover:underline">
          política de cookies
        </a>
        .
      </p>
    </>
  );
}
