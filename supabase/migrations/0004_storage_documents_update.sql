-- ═══════════════════════════════════════════════════════════════════════════
-- Vantara Weddings — 0004: gap caught by the live RLS verification run.
-- 0003 shipped 7 storage policies; vendor-documents was missing its UPDATE
-- policy (vendor-media had one). Adding it for parity — moves/renames of
-- documents are owner/admin-only, same rule as everything else.
-- ═══════════════════════════════════════════════════════════════════════════

create policy "vendor-documents owner or admin updates"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'vendor-documents'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] in (
        select v.id::text from public.vendors v where v.owner_user_id = auth.uid()
      )
    )
  )
  with check (
    bucket_id = 'vendor-documents'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] in (
        select v.id::text from public.vendors v where v.owner_user_id = auth.uid()
      )
    )
  );
