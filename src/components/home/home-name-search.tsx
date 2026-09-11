"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** "busca por... escola": a separate, explicit affordance from LocationInput (CEP/cidade) so a school-name search never shows a wrong "location not found" error. */
export function HomeNameSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/escolas?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Input
          label="Ou busque pelo nome da escola"
          placeholder="Ex.: Colégio Coração de Jesus"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
      </div>
      <Button type="submit" variant="outline" size="lg">
        <Search className="size-4" aria-hidden="true" />
        Buscar escola
      </Button>
    </form>
  );
}
