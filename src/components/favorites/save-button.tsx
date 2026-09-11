"use client";

import * as React from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { toggleFavoriteAction } from "@/lib/favorites/actions";
import type { FavoriteTargetType } from "@/lib/favorites/queries";

export interface SaveButtonProps {
  targetType: FavoriteTargetType;
  targetId: string;
  isAuthenticated: boolean;
  initialFavorited: boolean;
  /** Current page path, revalidated after a successful toggle. */
  path: string;
  className?: string;
}

const LABEL: Record<FavoriteTargetType, string> = { SCHOOL: "escola", LIST: "lista" };

/**
 * "Salvar" (PRD RF-013) -- anonymous visitors see a plain link into login
 * (never a button that silently no-ops) rather than a client-side auth
 * check, since the page already knows `isAuthenticated` from SSR.
 * `toggleFavoriteAction` re-verifies auth regardless (SEC-003).
 */
export function SaveButton({ targetType, targetId, isAuthenticated, initialFavorited, path, className }: SaveButtonProps) {
  const [favorited, setFavorited] = React.useState(initialFavorited);
  const [pending, startTransition] = React.useTransition();
  const { toast } = useToast();

  if (!isAuthenticated) {
    return (
      <Button asChild variant="outline" className={className}>
        <Link href={`/auth/entrar?next=${encodeURIComponent(path)}`}>
          <Heart className="size-4" aria-hidden="true" />
          Salvar
        </Link>
      </Button>
    );
  }

  function handleClick() {
    startTransition(async () => {
      const result = await toggleFavoriteAction(targetType, targetId, path);
      if (result.error) {
        toast({
          title: "Não foi possível salvar",
          description: "Tente novamente em instantes.",
          variant: "danger",
        });
        return;
      }
      setFavorited(result.favorited);
      toast({
        title: result.favorited ? `${LABEL[targetType]} salva` : `${LABEL[targetType]} removida dos salvos`,
        variant: "success",
      });
    });
  }

  return (
    <Button
      variant={favorited ? "secondary" : "outline"}
      onClick={handleClick}
      loading={pending}
      aria-pressed={favorited}
      className={className}
    >
      <Heart className={cn("size-4", favorited && "fill-current")} aria-hidden="true" />
      {favorited ? "Salvo" : "Salvar"}
    </Button>
  );
}
