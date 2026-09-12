import { Header } from "@/components/ui/header";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireUser } from "@/lib/auth/session";

const navItems = [
  { label: "Perfil", href: "/minha-conta/perfil" },
  { label: "Minhas listas", href: "/minha-conta/listas" },
  { label: "Escolas salvas", href: "/minha-conta/escolas-salvas" },
  { label: "Listas salvas", href: "/minha-conta/listas-salvas" },
  { label: "Configurações", href: "/minha-conta/configuracoes" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/minha-conta");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header
        navItems={navItems}
        actions={
          <div className="flex items-center gap-3">
            <span className="max-w-40 truncate text-sm text-neutral-600">{user.email}</span>
            <LogoutButton />
          </div>
        }
      />
      <main id="conteudo-principal" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
