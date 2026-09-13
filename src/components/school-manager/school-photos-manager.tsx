"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";

import { removeManagedSchoolImageAction, type FormState } from "@/lib/schools/manager-actions";
import type { ManagedSchoolImage } from "@/lib/schools/manager";
import { getPublicAssetUrl } from "@/lib/supabase/storage";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

interface SchoolIdentity {
  id: string;
  slug: string;
  uf: string;
  municipalitySlug: string;
}

function RemovePhotoForm({ school, imageId }: { school: SchoolIdentity; imageId: string }) {
  const [state, formAction] = useActionState(removeManagedSchoolImageAction, initialState);
  return (
    <form action={formAction} className="absolute right-1.5 top-1.5">
      <input type="hidden" name="school_id" value={school.id} />
      <input type="hidden" name="school_slug" value={school.slug} />
      <input type="hidden" name="school_uf" value={school.uf.toLowerCase()} />
      <input type="hidden" name="school_municipality_slug" value={school.municipalitySlug} />
      <input type="hidden" name="image_id" value={imageId} />
      {state?.error && (
        <p role="alert" className="sr-only">
          {state.error}
        </p>
      )}
      <SubmitButton
        variant="secondary"
        size="icon"
        aria-label="Remover foto"
        className="size-9 bg-white/90 hover:bg-white"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </SubmitButton>
    </form>
  );
}

/**
 * Onda 7. O upload vai para um Route Handler
 * (`/api/school-manager/fotos`), não para uma Server Action: o limite de
 * corpo padrão de Server Action é 1MB e o teto real é o do bucket (5MB) --
 * mesma escolha e mesma razão do upload de anexo de contribuição.
 */
export function SchoolPhotosManager({
  school,
  images,
}: {
  school: SchoolIdentity;
  images: ManagedSchoolImage[];
}) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    body.set("school_id", school.id);

    setUploading(true);
    setError(null);
    try {
      const response = await fetch("/api/school-manager/fotos", { method: "POST", body });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Não foi possível enviar a foto.");
        return;
      }
      form.reset();
      router.refresh();
    } catch {
      setError("Não foi possível enviar a foto. Verifique sua conexão.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image) => (
            <li key={image.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- host dinâmico do Supabase Storage, sem remotePatterns configurado (mesma exceção do perfil público). */}
              <img
                src={getPublicAssetUrl(image.storagePath)}
                alt={image.caption ?? "Foto da escola"}
                className="aspect-square w-full rounded-lg object-cover"
              />
              <RemovePhotoForm school={school} imageId={image.id} />
              {!image.isApproved && (
                <Badge variant="warning" className="absolute bottom-1.5 left-1.5">
                  Oculta pela equipe
                </Badge>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-600">Nenhuma foto ainda. A primeira aparece no perfil público.</p>
      )}

      <form
        ref={formRef}
        onSubmit={handleUpload}
        className="flex flex-col gap-3 rounded-xl border border-dashed border-neutral-300 p-3"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="school-photo-file" className="text-sm font-medium text-neutral-900">
            Nova foto
          </label>
          <input
            id="school-photo-file"
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp"
            required
            className="text-sm text-neutral-700 file:mr-3 file:rounded-lg file:border file:border-neutral-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-neutral-900 hover:file:bg-neutral-50"
          />
          <p className="text-sm text-neutral-600">JPG, PNG ou WebP, até 5MB.</p>
        </div>
        <Input label="Legenda (opcional)" name="caption" placeholder="Fachada, pátio, biblioteca..." />
        {error && (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" variant="outline" loading={uploading}>
            <ImagePlus className="size-4" aria-hidden="true" />
            Enviar foto
          </Button>
        </div>
      </form>
    </div>
  );
}
