import type { Metadata } from "next";

import { getCurrentProfile } from "@/lib/auth/session";
import { ProfileForm } from "@/components/account/profile-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Perfil" };

export default async function PerfilPage() {
  const profile = await getCurrentProfile();

  return (
    <>
      <h1 className="text-2xl font-semibold text-neutral-900">Perfil</h1>
      <div className="mt-6">
        <ProfileForm fullName={profile?.full_name ?? null} email={profile?.email ?? null} />
      </div>
    </>
  );
}
