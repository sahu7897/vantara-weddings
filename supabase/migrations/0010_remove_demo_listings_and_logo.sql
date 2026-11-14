-- ===========================================================================
-- Vantara Weddings - 0010: finish the logo swap and remove the demo listings.
--
-- WHY THIS IS NEEDED
-- 1. Header/footer logo: site_settings.general.logoUrl overrides
--    src/config/site.ts (see src/lib/cms/loadSiteSettings.ts). Migrations 0007
--    and 0008 stored /brand/vantara-logo.png, which still has the WEDDINGS
--    line under the wordmark. 0009 was meant to switch it to the SVG. This
--    repeats that update so the live header is correct even if 0009 was never
--    run on the live project. If no 'general' row exists, the code fallback is
--    already the SVG.
-- 2. "Featured venues & vendors" (src/components/home/SectionFeaturedListings.tsx)
--    renders approved rows from public.vendors and public.venues. The demo rows
--    from supabase/seed.sql (fixed ids ...0001 to ...0004 and ...0101 to ...0103)
--    are still in the live database. They are not real businesses, so they are
--    removed here.
--
-- SAFETY
-- - Only the seed ids listed below are touched. Real vendors are never matched.
-- - A demo vendor that was linked to an account (owner_user_id not null) is kept.
-- - If any booking references a demo vendor, the migration stops with an error
--   and deletes nothing. Bookings cascade-delete with their vendor.
-- - Re-running is safe: missing rows are simply skipped.
-- - With no approved rows, SectionFeaturedListings renders nothing rather than
--   fake cards. The homepage uses ISR (revalidate: 300), so changes can take up
--   to 5 minutes to appear. A redeploy is not required.
-- ===========================================================================

-- ── 1. logo ─────────────────────────────────────────────────────────────────
update public.site_settings
   set value = jsonb_set(value, '{logoUrl}', '"/brand/vantara-logo-transparent.svg"'::jsonb, true),
       updated_at = now()
 where key = 'general';

-- ── 2. demo listings ────────────────────────────────────────────────────────
do $$
declare
  demo_vendor_ids uuid[] := array[
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000004'
  ]::uuid[];
  demo_venue_ids uuid[] := array[
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000103'
  ]::uuid[];
  booking_count int;
  kept_vendors int;
  kept_venues int;
begin
  select count(*) into booking_count
    from public.bookings
   where vendor_id = any(demo_vendor_ids);
  if booking_count > 0 then
    raise exception '0010: % booking(s) reference a demo vendor. Resolve them first; nothing was deleted.', booking_count;
  end if;

  -- Venues go first. Only venues whose vendor is unlinked are removed, so a
  -- demo vendor that an account owns keeps its venue rows too.
  delete from public.venues
   where id = any(demo_venue_ids)
     and vendor_id in (
       select id from public.vendors
        where id = any(demo_vendor_ids) and owner_user_id is null
     );
  delete from public.vendors
   where id = any(demo_vendor_ids) and owner_user_id is null;

  select count(*) into kept_vendors from public.vendors where id = any(demo_vendor_ids);
  select count(*) into kept_venues from public.venues where id = any(demo_venue_ids);
  raise notice '0010 demo rows kept (linked to an account): % vendor(s), % venue(s)', kept_vendors, kept_venues;
end $$;

-- ── verification ────────────────────────────────────────────────────────────
do $$
declare
  g jsonb;
begin
  select value into g from public.site_settings where key = 'general';
  if g is not null and coalesce(g->>'logoUrl', '') <> '/brand/vantara-logo-transparent.svg' then
    raise exception '0010: general.logoUrl was not updated to the SVG logo';
  end if;
  raise notice '0010 OK - general.logoUrl: %', g->>'logoUrl';
end $$;
