-- ═══════════════════════════════════════════════════════════════════════════
-- Vantara Weddings — Phase 5, §13.5: storage buckets + storage RLS
-- 0003_storage.sql
--   vendor-media      → public read, write only by the owning vendor or admin
--   vendor-documents  → private; owner reads/writes own folder, admin all
-- Path convention (enforced below): <vendor_id>/<filename>
-- ═══════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('vendor-media', 'vendor-media', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('vendor-documents', 'vendor-documents', false)
on conflict (id) do nothing;

-- ── vendor-media: public read ───────────────────────────────────────────────
create policy "vendor-media public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'vendor-media');

-- ── vendor-media: writes restricted to the owning vendor or admin ───────────
create policy "vendor-media owner or admin inserts"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vendor-media'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] in (
        select v.id::text from public.vendors v where v.owner_user_id = auth.uid()
      )
    )
  );

create policy "vendor-media owner or admin updates"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'vendor-media'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] in (
        select v.id::text from public.vendors v where v.owner_user_id = auth.uid()
      )
    )
  )
  with check (
    bucket_id = 'vendor-media'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] in (
        select v.id::text from public.vendors v where v.owner_user_id = auth.uid()
      )
    )
  );

create policy "vendor-media owner or admin deletes"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'vendor-media'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] in (
        select v.id::text from public.vendors v where v.owner_user_id = auth.uid()
      )
    )
  );

-- ── vendor-documents: private (no anon policy ⇒ anon cannot read) ──────────
create policy "vendor-documents owner or admin reads"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vendor-documents'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] in (
        select v.id::text from public.vendors v where v.owner_user_id = auth.uid()
      )
    )
  );

create policy "vendor-documents owner or admin inserts"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vendor-documents'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] in (
        select v.id::text from public.vendors v where v.owner_user_id = auth.uid()
      )
    )
  );

create policy "vendor-documents owner or admin deletes"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'vendor-documents'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] in (
        select v.id::text from public.vendors v where v.owner_user_id = auth.uid()
      )
    )
  );
