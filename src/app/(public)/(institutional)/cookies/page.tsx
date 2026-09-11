import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: "Quais cookies o Listada Escola usa.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <>
      <h1>Política de cookies</h1>
      <p>
        O Listada Escola usa cookies estritamente funcionais, necessários para você permanecer
        autenticado entre uma página e outra depois de entrar na sua conta. Não usamos cookies de
        publicidade nem de rastreamento de terceiros.
      </p>

      <h2>Cookies que usamos</h2>
      <ul>
        <li>
          <strong>Sessão de autenticação:</strong> mantém você conectado depois de fazer login, para não
          precisar entrar de novo a cada página.
        </li>
      </ul>

      <h2>Como desativar</h2>
      <p>
        Você pode bloquear cookies nas configurações do seu navegador, mas isso impede o login — as
        áreas que exigem conta (enviar lista, sugerir escola, avaliar, favoritar) deixam de funcionar
        sem o cookie de sessão. A busca e consulta de escolas e listas publicadas continuam funcionando
        normalmente sem login.
      </p>
    </>
  );
}
