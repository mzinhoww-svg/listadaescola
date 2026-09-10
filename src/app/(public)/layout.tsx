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
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/auth/entrar">Entrar</Link>
          </Button>
        }
      />
      <main id="conteudo-principal" className="flex-1">
        {children}
      </main>
      <Footer columns={footerColumns} />
    </div>
  );
}
