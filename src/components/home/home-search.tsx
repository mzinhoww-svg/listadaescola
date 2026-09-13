"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LocateFixed, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { resolveLocationByCoordsAction } from "@/lib/geocoding/resolve-location";
import { homeSearchAction, type HomeSearchResult } from "@/lib/schools/home-search";
import { locationToResultsUrl } from "@/lib/schools/results-url";
import { HomeSearchResults } from "./home-search-results";

/**
 * Onda 3 -- um campo só.
 *
 * O cartão de busca da home tinha cinco controles e dois caminhos
 * concorrentes: `HomeLocationSearch` ("CEP ou cidade" + "Buscar") e
 * `HomeNameSearch` ("Ou busque pelo nome da escola" + "Buscar escola").
 * Dois botões quase homônimos, e a obrigação de a mãe classificar o que
 * ela tem na mão antes de digitar -- com punição por errar: quem digitava
 * o nome da escola no campo de localização recebia "não encontramos essa
 * localização", que é falso e desanima.
 *
 * Agora é um campo que aceita CEP, cidade OU nome de escola, e quem
 * classifica é `homeSearchAction` (a heurística e sua ordem estão
 * documentadas lá). "Usar minha localização" continua um botão à parte de
 * propósito: é outra AÇÃO -- a coordenada vem do navegador, não do que foi
 * digitado -- e não um segundo caminho de busca.
 *
 * Lugar (CEP/cidade/ponto) navega para /escolas, que é a tela feita para
 * isso. Nome de escola responde aqui mesmo: é onde a captura de intenção
 * ("me avise quando publicarem") precisa acontecer.
 */
export function HomeSearch({ uf = "MT" }: { uf?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const [result, setResult] = React.useState<HomeSearchResult | null>(null);

  function goToLocation(url: string) {
    // Continua em "carregando" até a navegação acontecer: zerar o estado
    // aqui faria o botão voltar ao normal por um instante antes da tela
    // trocar, o que lê como "não funcionou".
    setResult(null);
    router.push(url);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    try {
      const found = await homeSearchAction(query, uf);
      if (found.kind === "location") {
        goToLocation(found.url);
        return;
      }
      setResult(found.kind === "empty" ? null : found);
    } catch {
      toast({
        variant: "danger",
        title: "A busca falhou",
        description: "Tente de novo em instantes.",
      });
    } finally {
      setIsSearching(false);
    }
  }

  function handleLocateMe() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      toast({
        variant: "danger",
        title: "Geolocalização indisponível",
        description: "Seu navegador não oferece suporte a essa função. Digite um CEP ou cidade.",
      });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const resolved = await resolveLocationByCoordsAction(position.coords.latitude, position.coords.longitude);
          goToLocation(locationToResultsUrl(resolved));
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        toast({
          variant: "danger",
          title: "Não foi possível obter sua localização",
          description: "Permita o acesso à localização no navegador ou digite um CEP/cidade.",
        });
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  const statusMessage =
    result?.kind === "schools"
      ? `${result.totalCount} ${result.totalCount === 1 ? "escola encontrada" : "escolas encontradas"} para ${result.query}.`
      : result?.kind === "not-found"
        ? `Nenhum resultado para ${result.query}.`
        : "";

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="CEP, cidade ou nome da escola"
          placeholder="Ex.: 78005-000, Cuiabá ou Tia Coruja"
          helperText="Um campo só — a gente entende o que você digitou."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          enterKeyHint="search"
          autoComplete="off"
          maxLength={120}
        />
        {/* flex-wrap: os dois botões lado a lado estouram a viewport em
            390px, o menor alvo mobile do design system. */}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="lg" loading={isSearching} className="flex-1 sm:flex-none">
            <Search className="size-4" aria-hidden="true" />
            Buscar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            loading={isLocating}
            onClick={handleLocateMe}
            className="flex-1 sm:flex-none"
          >
            <LocateFixed className="size-4" aria-hidden="true" />
            Usar minha localização
          </Button>
        </div>
      </form>

      {/* O resultado aparece sem troca de página, então precisa ser
          anunciado. A região viva é esta linha invisível, sempre presente no
          DOM (leitor de tela ignora região viva que nasce junto com o
          conteúdo) e curta de propósito -- envolver a lista inteira faria o
          leitor reler todos os resultados a cada vez que alguém abrisse o
          formulário de aviso dentro dela. */}
      <p className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </p>
      {result && <HomeSearchResults result={result} />}
    </div>
  );
}
