import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-neutral-50">
      <header className="px-4 py-6 sm:px-6">
        <Link
          href="/"
          className="text-base font-semibold text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          Listada Escola
        </Link>
      </header>
      <main
        id="conteudo-principal"
        className="flex flex-1 items-center justify-center px-4 pb-16"
      >
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
