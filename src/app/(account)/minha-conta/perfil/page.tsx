import type { Metadata } from "next";

import { getCurrentProfile } from "@/lib/auth/session";
import { ProfileForm } from "@/components/account/profile-form";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Perfil" };

export default async function PerfilPage() {
  const profile = await getCurrentProfile();

  return (
    <>
      <h1 className="text-2xl font-semibold text-neutral-900">Perfil</h1>
      <Card className="mt-6 max-w-sm">
        <CardContent className="pt-4 sm:pt-5">
          <ProfileForm fullName={profile?.full_name ?? null} email={profile?.email ?? null} />
        </CardContent>
      </Card>
    </>
  );
}
