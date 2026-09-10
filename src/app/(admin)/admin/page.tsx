import type { Metadata } from "next";
import { School, ListChecks, ShieldAlert } from "lucide-react";

import { ScaffoldNotice } from "@/components/dev/scaffold-notice";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

const stats = [
  { icon: School, title: "Escolas ativas (MT)", description: "—" },
  { icon: ListChecks, title: "Listas publicadas", description: "—" },
  { icon: ShieldAlert, title: "Submissões pendentes", description: "—" },
];

export default function AdminDashboardPage() {
  return (
    <>
      <ScaffoldNotice promptRef="Prompt 12 — admin de escolas, listas e parceiros" />
      <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map(({ icon: Icon, title, description }) => (
          <Card key={title}>
            <CardHeader>
              <Icon className="size-5 text-primary-600" aria-hidden="true" />
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </>
  );
}
