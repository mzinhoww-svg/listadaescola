import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Heart, Bookmark, Star, Building2 } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/session";
import { getOwnSubmissions, getOwnSchoolSuggestions } from "@/lib/contributions/queries";
import { getOwnReviews } from "@/lib/reviews/queries";
import { getFavoriteSchools, getFavoriteLists } from "@/lib/favorites/queries";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Minha conta" };

export default async function MinhaContaPage() {
  const [profile, submissions, reviews, suggestions, favoriteSchools, favoriteLists] = await Promise.all([
    getCurrentProfile(),
    getOwnSubmissions(),
    getOwnReviews(),
    getOwnSchoolSuggestions(),
    getFavoriteSchools(),
    getFavoriteLists(),
  ]);
  const needsCorrection = submissions.filter((s) => s.status === "NEEDS_CORRECTION").length;

  const summaryCards = [
    {
      icon: FileText,
      title: "Listas enviadas",
      href: "/minha-conta/listas",
      description:
        needsCorrection > 0
          ? `${submissions.length} · ${needsCorrection} precisa${needsCorrection > 1 ? "m" : ""} de correção`
          : `${submissions.length} no total`,
    },
    {
      icon: Star,
      title: "Minhas avaliações",
      href: "/minha-conta/avaliacoes",
      description: `${reviews.length} no total`,
    },
    {
      icon: Building2,
      title: "Minhas sugestões",
      href: "/minha-conta/sugestoes",
      description: `${suggestions.length} no total`,
    },
    {
      icon: Heart,
      title: "Escolas salvas",
      href: "/minha-conta/escolas-salvas",
      description: `${favoriteSchools.schools.length} salva${favoriteSchools.schools.length === 1 ? "" : "s"}`,
    },
    {
      icon: Bookmark,
      title: "Listas salvas",
      href: "/minha-conta/listas-salvas",
      description: `${favoriteLists.lists.length} salva${favoriteLists.lists.length === 1 ? "" : "s"}`,
    },
  ];

  return (
    <>
      <h1 className="text-2xl font-semibold text-neutral-900">
        {profile?.full_name ? `Olá, ${profile.full_name}` : "Minha conta"}
      </h1>
      <h2 className="sr-only">Resumo da conta</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {summaryCards.map(({ icon: Icon, title, href, description }) => (
          <Link key={title} href={href} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
            <Card className="h-full transition-colors hover:border-primary-300">
              <CardHeader>
                <Icon className="size-5 text-primary-600" aria-hidden="true" />
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
