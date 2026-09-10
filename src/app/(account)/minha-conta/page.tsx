import type { Metadata } from "next";
import { FileText, Heart, Bookmark } from "lucide-react";

import { ScaffoldNotice } from "@/components/dev/scaffold-notice";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Minha conta" };

const summaryCards = [
  { icon: FileText, title: "Listas enviadas", description: "Acompanhe o status das suas contribuições." },
  { icon: Heart, title: "Escolas salvas", description: "Escolas que você favoritou." },
  { icon: Bookmark, title: "Listas salvas", description: "Listas que você guardou para depois." },
];

export default function MinhaContaPage() {
  return (
    <>
      <ScaffoldNotice promptRef="Prompt 03 — auth, profiles e RBAC" />
      <h1 className="text-2xl font-semibold text-neutral-900">Minha conta</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {summaryCards.map(({ icon: Icon, title, description }) => (
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
