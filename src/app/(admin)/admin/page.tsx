import type { Metadata } from "next";
import Link from "next/link";
import { School, ListChecks, ShieldAlert, MessageSquareWarning, Store, ShoppingBag } from "lucide-react";

import { getDashboardStats } from "@/lib/admin/dashboard";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    { icon: School, title: "Escolas ativas (MT)", value: stats.activeSchools, href: "/admin/escolas" },
    { icon: ListChecks, title: "Listas publicadas", value: stats.publishedLists, href: "/admin/listas" },
    { icon: ShieldAlert, title: "Submissões pendentes", value: stats.pendingSubmissions, href: "/admin/moderacao" },
    { icon: MessageSquareWarning, title: "Sugestões pendentes", value: stats.pendingSuggestions, href: "/admin/moderacao/sugestoes" },
    { icon: Store, title: "Papelarias ativas", value: stats.activeStores, href: "/admin/papelarias" },
    { icon: ShoppingBag, title: "Parceiros ativos", value: stats.activePartners, href: "/admin/ecommerce" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500">
          Visitas, buscas, cliques e conversão entram no Prompt 14 (analytics-vendas) -- os números abaixo são só
          contagens reais do banco, nunca estimados.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ icon: Icon, title, value, href }) => (
          <Link key={title} href={href}>
            <Card className="transition-colors hover:border-primary-300">
              <CardHeader>
                <Icon className="size-5 text-primary-600" aria-hidden="true" />
                <CardTitle>{title}</CardTitle>
                <CardDescription className="text-2xl font-semibold text-neutral-900">{value}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
