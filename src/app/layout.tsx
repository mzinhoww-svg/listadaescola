import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { getSiteBaseUrl } from "@/lib/seo/site-url";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Required for relative openGraph.images/alternates.canonical to resolve
  // to real absolute URLs (Prompt 15) -- needs NEXT_PUBLIC_SITE_URL set in
  // the Vercel production env once a custom domain exists; falls back to
  // VERCEL_URL (preview deployments) then localhost, same fallback chain
  // as every other "external configuration not confirmed" gap this
  // project has flagged rather than silently assumed (see WORKFLOW.md).
  metadataBase: new URL(getSiteBaseUrl()),
  title: {
    default: "Listada Escola",
    template: "%s · Listada Escola",
  },
  description:
    "Encontre a escola, descubra a lista e resolva a compra em um só lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#conteudo-principal"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Pular para o conteúdo principal
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
