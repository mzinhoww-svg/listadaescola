import { createPublicClient } from "@/lib/supabase/public";

/**
 * Resolves a `public-assets` storage_path (e.g. "schools/{id}/foto.jpg")
 * to its public URL. Pure string construction against a public bucket
 * (storage/20260910201800_storage.sql) -- no network call, safe to use
 * freely in a render loop.
 */
export function getPublicAssetUrl(storagePath: string): string {
  return createPublicClient().storage.from("public-assets").getPublicUrl(storagePath).data.publicUrl;
}
