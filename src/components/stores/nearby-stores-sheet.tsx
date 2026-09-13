"use client";

import * as React from "react";
import { Scale, Store } from "lucide-react";

import { useMediaQuery } from "@/hooks/use-media-query";
import { getNearbyStoresForSchoolAction } from "@/lib/stores/actions";
import type { NearbyStore } from "@/lib/stores/nearby-stores";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { DialogRoot, DialogTrigger } from "@/components/ui/dialog-primitives";
import { DrawerContent } from "@/components/ui/drawer";
import { BottomSheetContent } from "@/components/ui/bottom-sheet";
import { StoreCard } from "@/components/stores/store-card";
import { CompareQuotesPanel, MIN_STORES_TO_COMPARE } from "@/components/stores/compare-quotes-panel";

export interface NearbyStoresSheetProps {
  schoolId: string;
  /** Omitted on the school profile's general cross-link (no specific list
   * in context yet) -- see StoreCard's own note on the fallback. */
  listId?: string;
}

type LoadState = "idle" | "loading" | "loaded";

const SHEET_TITLE = "Papelarias próximas";
const SHEET_DESCRIPTION = "Peça orçamento direto no WhatsApp da loja.";
const COMPARE_TITLE = "Comparar orçamentos";
const COMPARE_DESCRIPTION = "A mesma lista para mais de uma papelaria, uma conversa de cada vez.";

/**
 * Drawer on desktop, BottomSheet on mobile (Prompt 09) -- both are thin
 * wrappers around the same DialogRoot/DialogTrigger (dialog-primitives.tsx),
 * so this uses that shared root directly and only swaps which *Content*
 * presentation is nested inside based on viewport. Using each wrapper's
 * own `<Drawer>`/`<BottomSheet>` (each with its own internal DialogRoot)
 * instead would mean a viewport change mid-interaction unmounts and
 * remounts the whole dialog root -- observed once in testing as a click
 * on the trigger silently doing nothing right as the SSR->client
 * `useMediaQuery` correction landed. A single stable root has no such
 * window.
 *
 * Store data is fetched on first open (not eagerly with the lista page):
 * ties `store_view` to an actual view and skips the query entirely for
 * visitors who never click through.
 */
export function NearbyStoresSheet({ schoolId, listId }: NearbyStoresSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const [open, setOpen] = React.useState(false);
  const [loadState, setLoadState] = React.useState<LoadState>("idle");
  const [stores, setStores] = React.useState<NearbyStore[]>([]);
  const [comparing, setComparing] = React.useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setComparing(false);
    if (nextOpen && loadState === "idle") {
      setLoadState("loading");
      getNearbyStoresForSchoolAction(schoolId, listId)
        .then((result) => {
          setStores(result);
          setLoadState("loaded");
        })
        .catch(() => setLoadState("loaded"));
    }
  }

  // Comparar só faz sentido com uma lista em contexto (é a lista itemizada
  // que vai igual para todas) e com pelo menos duas lojas alcançáveis por
  // WhatsApp -- ver CompareQuotesPanel.
  const reachableCount = stores.filter((store) => store.whatsappNormalized !== null).length;
  const canCompare = Boolean(listId) && reachableCount >= MIN_STORES_TO_COMPARE;

  let body: React.ReactNode;
  if (loadState === "loading") {
    body = <LoadingState label="Procurando papelarias próximas…" />;
  } else if (loadState === "loaded" && stores.length === 0) {
    body = (
      <EmptyState
        icon={Store}
        title="Nenhuma papelaria parceira próxima ainda"
        description="Ainda não temos papelarias cadastradas perto desta escola."
      />
    );
  } else if (comparing && listId) {
    body = (
      <CompareQuotesPanel
        stores={stores}
        schoolId={schoolId}
        listId={listId}
        onExit={() => setComparing(false)}
      />
    );
  } else {
    body = (
      <div className="flex flex-col gap-3">
        {canCompare && (
          <div className="rounded-xl border border-neutral-200 bg-surface-soft p-3">
            <p className="text-sm text-neutral-700">
              Quer comparar preço? Mande a mesma lista para mais de uma papelaria.
            </p>
            <Button variant="outline" className="mt-2 w-full sm:w-auto" onClick={() => setComparing(true)}>
              <Scale className="size-4" aria-hidden="true" />
              Comparar orçamentos
            </Button>
          </div>
        )}
        {stores.map((store) => (
          <StoreCard key={store.id} store={store} schoolId={schoolId} listId={listId} />
        ))}
      </div>
    );
  }

  const Content = isDesktop ? DrawerContent : BottomSheetContent;

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Store className="size-4" aria-hidden="true" />
          Ver papelarias próximas
        </Button>
      </DialogTrigger>
      <Content
        title={comparing ? COMPARE_TITLE : SHEET_TITLE}
        description={comparing ? COMPARE_DESCRIPTION : SHEET_DESCRIPTION}
      >
        {body}
      </Content>
    </DialogRoot>
  );
}
