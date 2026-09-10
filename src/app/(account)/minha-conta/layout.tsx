import { Header } from "@/components/ui/header";

const navItems = [
  { label: "Perfil", href: "/minha-conta/perfil" },
  { label: "Minhas listas", href: "/minha-conta/listas" },
  { label: "Escolas salvas", href: "/minha-conta/escolas-salvas" },
  { label: "Configurações", href: "/minha-conta/configuracoes" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header navItems={navItems} />
      <main id="conteudo-principal" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
