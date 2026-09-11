"use client";

import { Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { recordAnalyticsEvent } from "@/lib/analytics/record-event";

export interface ShareButtonProps {
  title: string;
  path: string;
  schoolId: string;
  listId: string;
  className?: string;
}

/**
 * "Compartilhar" (Prompt 07): Web Share API when available (mobile),
 * clipboard fallback otherwise. `list_share` is recorded on intent (the
 * tap), not on completion -- the native share sheet gives no reliable
 * "the user actually sent it" signal, and a cancelled share is still a
 * meaningful engagement signal for RF-015 KPIs.
 */
export function ShareButton({ title, path, schoolId, listId, className }: ShareButtonProps) {
  const { toast } = useToast();

  async function handleShare() {
    const url = new URL(path, window.location.origin).toString();
    void recordAnalyticsEvent({ eventType: "list_share", schoolId, listId });

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled the native share sheet -- not an error.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado", description: url, variant: "success" });
    } catch {
      toast({ title: "Não foi possível copiar o link", variant: "danger" });
    }
  }

  return (
    <Button variant="outline" onClick={handleShare} className={className}>
      <Share2 className="size-4" aria-hidden="true" />
      Compartilhar
    </Button>
  );
}
