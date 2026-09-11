import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como funciona",
  description: "Encontre a escola, descubra a lista de material escolar e resolva a compra em um só lugar.",
  alternates: { canonical: "/como-funciona" },
};

export default function ComoFuncionaPage() {
  return (
    <>
      <h1>Como funciona</h1>
      <p>
        O Listada Escola ajuda você a encontrar a escola do seu filho, consultar a lista de material
        escolar da série certa e resolver a compra — online com um parceiro de e-commerce ou localmente
        com uma papelaria, por WhatsApp.
      </p>

      <h2>1. Informe sua localização</h2>
      <p>
        Digite seu CEP, sua cidade ou use a localização do seu navegador. Você pode trocar a localização
        a qualquer momento.
      </p>

      <h2>2. Encontre a escola</h2>
      <p>
        Buscamos escolas ativas em Mato Grosso a partir da base oficial do INEP, priorizando as mais
        próximas de você quando há coordenadas disponíveis.
      </p>

      <h2>3. Escolha a série e o ano letivo</h2>
      <p>Cada escola pode ter várias listas, uma para cada série e ano letivo.</p>

      <h2>4. Consulte a lista</h2>
      <p>
        Só listas revisadas e aprovadas pela nossa equipe de moderação ficam visíveis publicamente —
        nunca uma lista enviada por um usuário vira conteúdo público sem passar por essa checagem.
      </p>

      <h2>5. Compre online ou localmente</h2>
      <p>
        A partir da lista, você pode comprar com um parceiro de e-commerce (o link leva direto para a
        oferta do parceiro) ou pedir orçamento numa papelaria próxima pelo WhatsApp, com a lista
        pré-preenchida na mensagem. O Listada Escola não processa pagamento — a compra acontece
        diretamente com o parceiro ou a papelaria.
      </p>

      <h2>Quer contribuir?</h2>
      <p>
        Se você tem a lista de uma escola que ainda não está aqui, pode{" "}
        <Link href="/enviar-lista" className="font-medium text-primary-700 hover:underline">
          enviar a lista
        </Link>{" "}
        depois de criar uma conta. Não encontrou a escola?{" "}
        <Link href="/sugerir-escola" className="font-medium text-primary-700 hover:underline">
          Sugira a inclusão dela
        </Link>
        . Toda contribuição passa por moderação antes de ficar pública.
      </p>
    </>
  );
}
