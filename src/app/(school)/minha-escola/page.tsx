import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ExternalLink, Lock } from "lucide-react";

import { getManagedSchool, getManagedSchoolContacts, getManagedSchoolImages } from "@/lib/schools/manager";
import { SchoolProfileForm } from "@/components/school-manager/school-profile-form";
import { SchoolContactsManager } from "@/components/school-manager/school-contacts-manager";
import { SchoolPhotosManager } from "@/components/school-manager/school-photos-manager";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatSchoolAddress } from "@/lib/schools/format";
import { slugify, toDisplayCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Minha escola" };

export const dynamic = "force-dynamic";

export default async function MinhaEscolaPage() {
  // O layout já garantiu o vínculo; se chegou aqui, existe escola. O
  // `getManagedSchool` é `cache`ado por request, então isto não é uma
  // segunda ida ao banco.
  const school = await getManagedSchool();
  if (!school) return null;

  const [contacts, images] = await Promise.all([
    getManagedSchoolContacts(school.id),
    getManagedSchoolImages(school.id),
  ]);

  const municipalitySlug = slugify(school.municipality);
  const publicHref = `/escolas/${school.uf.toLowerCase()}/${municipalitySlug}/${school.slug}`;
  const identity = { id: school.id, slug: school.slug, uf: school.uf, municipalitySlug };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={school.isActive ? "success" : "neutral"}>{school.isActive ? "No ar" : "Fora do ar"}</Badge>
          {school.profile.isVerified && (
            <Badge variant="info">
              <BadgeCheck className="size-3" aria-hidden="true" />
              Verificada
            </Badge>
          )}
        </div>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">{toDisplayCase(school.name)}</h1>
        <p className="text-sm text-neutral-500">
          {school.municipality}/{school.uf} · INEP {school.inepCode}
        </p>
        <Link
          href={publicHref}
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline"
        >
          Ver o perfil como as famílias veem
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="size-4 text-neutral-400" aria-hidden="true" />
              Dados oficiais (INEP)
            </span>
          </CardTitle>
          <CardDescription>
            Nome, código INEP e endereço vêm do Censo Escolar e não são editáveis por aqui — nem pela escola,
            nem por nós fora da importação oficial. Se algo estiver errado, fale com a nossa equipe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-neutral-500">Endereço</dt>
              <dd className="text-neutral-900">
                {formatSchoolAddress(school.address, school.municipality, school.uf)}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Telefone (INEP)</dt>
              <dd className="text-neutral-900">{school.phone ?? "não informado"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Perfil editorial</CardTitle>
          <CardDescription>O que a sua escola conta sobre si mesma no perfil público.</CardDescription>
        </CardHeader>
        <CardContent>
          <SchoolProfileForm school={school} municipalitySlug={municipalitySlug} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Contatos</CardTitle>
          <CardDescription>
            Além do telefone oficial do INEP. Marque como interno o que não deve aparecer para as famílias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SchoolContactsManager school={identity} contacts={contacts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Fotos</CardTitle>
          <CardDescription>Aparecem no perfil público assim que você envia.</CardDescription>
        </CardHeader>
        <CardContent>
          <SchoolPhotosManager school={identity} images={images} />
        </CardContent>
      </Card>
    </div>
  );
}
