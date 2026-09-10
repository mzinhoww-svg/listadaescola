-- Storage: `public-assets` (approved public assets -- school logos/photos,
-- store photos) and `submissions` (private, community upload attachments).
--
-- MIME type and size limits are enforced natively by Storage at the bucket
-- level (not hand-rolled in RLS) -- that's what file_size_limit and
-- allowed_mime_types below do. Path convention encodes ownership so
-- policies can check it directly via storage.foldername():
--   public-assets:  {schools|stores}/{entity_id}/{filename}
--   submissions:    {user_id}/{submission_id}/{filename}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-assets', 'public-assets', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submissions', 'submissions', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
);

-- public-assets: readable by anyone (public bucket), writes gated by
-- ownership of the entity named in the path, or admin.
create policy "public_assets_select" on storage.objects
  for select to public
  using (bucket_id = 'public-assets');

create policy "public_assets_manager_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'public-assets'
    and (
      public.is_admin()
      or (
        (storage.foldername(name))[1] = 'schools'
        and public.is_school_manager(((storage.foldername(name))[2])::uuid)
      )
      or (
        (storage.foldername(name))[1] = 'stores'
        and public.is_store_manager(((storage.foldername(name))[2])::uuid)
      )
    )
  );

create policy "public_assets_manager_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'public-assets'
    and (
      public.is_admin()
      or (
        (storage.foldername(name))[1] = 'schools'
        and public.is_school_manager(((storage.foldername(name))[2])::uuid)
      )
      or (
        (storage.foldername(name))[1] = 'stores'
        and public.is_store_manager(((storage.foldername(name))[2])::uuid)
      )
    )
  );

create policy "public_assets_manager_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'public-assets'
    and (
      public.is_admin()
      or (
        (storage.foldername(name))[1] = 'schools'
        and public.is_school_manager(((storage.foldername(name))[2])::uuid)
      )
      or (
        (storage.foldername(name))[1] = 'stores'
        and public.is_store_manager(((storage.foldername(name))[2])::uuid)
      )
    )
  );

-- submissions: private, folder-per-user. The first path segment is the
-- uploader's own auth.uid(), so ownership is just a string compare -- no
-- join back to list_submissions needed. Admin gets a separate read-only
-- policy for moderation (can view every submitted attachment, never
-- upload/delete on a user's behalf).
create policy "submissions_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "submissions_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'submissions' and public.is_admin());

create policy "submissions_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "submissions_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);
