import Link from "next/link";

import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Escolas", href: "/escolas" },
  { label: "Listas", href: "/listas" },
  { label: "Papelarias", href: "/papelarias" },
  { label: "Como funciona", href: "/como-funciona" },
];

const footerColumns = [
  {
    title: "Produto",
    items: [
      { label: "Como funciona", href: "/como-funciona" },
      { label: "Enviar lista", href: "/enviar-lista" },
      { label: "Para escolas", href: "/para-escolas" },
      { label: "Para papelarias", href: "/para-papelarias" },
      { label: "Parceiros", href: "/parceiros" },
    ],
  },
  {
    title: "Legal",
    items: [
      { label: "Termos", href: "/termos" },
      { label: "Privacidade", href: "/privacidade" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header
        navItems={navItems}
        /*
          Onda 2 P1: todo o lado da oferta depende de famílias enviarem
          listas, e /enviar-lista não estava no header nem no rodapé. O
          Header renderiza `actions` também dentro do menu mobile, então um
          botão aqui cobre os dois tamanhos de tela.
        */
        actions={
          <>
            <Button asChild size="sm">
              <Link href="/enviar-lista">Enviar lista</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/auth/entrar">Entrar</Link>
            </Button>
          </>
        }
      />
      <main id="conteudo-principal" className="flex-1">
        {children}
      </main>
      <Footer columns={footerColumns} />
    </div>
  );
}
