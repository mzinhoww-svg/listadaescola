import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Style guide",
  robots: { index: false, follow: false },
};

export default function StyleGuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-neutral-50">
      <main id="conteudo-principal" className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}
