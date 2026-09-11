import type { Metadata } from "next";

import { SuggestSchoolForm } from "@/components/contributions/suggest-school-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sugerir escola" };

export default function SugerirEscolaPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1">Sugerir uma escola</CardTitle>
        <CardDescription>
          Não encontrou a escola na nossa base? Conte pra gente e nossa equipe avalia a inclusão.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SuggestSchoolForm />
      </CardContent>
    </Card>
  );
}
