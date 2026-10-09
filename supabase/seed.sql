-- ═══════════════════════════════════════════════════════════════════════════
-- Vantara Weddings — Phase 5 seed data (§13.8)
-- CLEARLY FAKE sample data — every name is marked (FAKE DATA) and every venue
-- address is a sample address. Replace/delete freely; nothing here is real.
-- Idempotent: safe to run repeatedly (fixed uuids + on conflict do nothing).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── launch cities (§13 context: Banda → Jhansi → Lucknow → Delhi/NCR) ──────
insert into public.cities (slug, name, state) values
  ('banda',     'Banda',     'Uttar Pradesh'),
  ('jhansi',    'Jhansi',    'Uttar Pradesh'),
  ('lucknow',   'Lucknow',   'Uttar Pradesh'),
  ('delhi-ncr', 'Delhi NCR', 'Delhi')
on conflict (slug) do nothing;

-- ── sample localities (real areas of those cities; add Banda areas later) ──
insert into public.localities (city_slug, slug, name) values
  ('lucknow',   'hazratganj',  'Hazratganj'),
  ('lucknow',   'gomti-nagar', 'Gomti Nagar'),
  ('delhi-ncr', 'saket',       'Saket'),
  ('delhi-ncr', 'karol-bagh',  'Karol Bagh'),
  ('jhansi',    'civil-lines', 'Civil Lines')
on conflict (slug) do nothing;

-- ── sample vendors (owner null = not linked to any account yet) ────────────
insert into public.vendors
  (id, owner_user_id, business_name, category, city, locality, description, price_min, price_max, status)
values
  ('00000000-0000-4000-8000-000000000001', null,
   'Sample Banquets Banda (FAKE DATA)', 'venue', 'banda', 'Sample Locality',
   'Clearly fake sample venue vendor created by supabase/seed.sql for testing.',
   50000, 250000, 'approved'),
  ('00000000-0000-4000-8000-000000000002', null,
   'Sample Decor House Banda (FAKE DATA)', 'decor', 'banda', 'Sample Locality',
   'Clearly fake sample decorator created by supabase/seed.sql for testing.',
   15000, 80000, 'approved'),
  ('00000000-0000-4000-8000-000000000003', null,
   'Sample Clicks Photography Banda (FAKE DATA)', 'photography', 'banda', 'Sample Locality',
   'Clearly fake sample photographer created by supabase/seed.sql for testing.',
   20000, 100000, 'approved'),
  ('00000000-0000-4000-8000-000000000004', null,
   'Sample Pending Decor Jhansi (FAKE DATA)', 'decor', 'jhansi', 'Civil Lines',
   'Clearly fake PENDING vendor — exists so admin approve/reject can be tested.',
   null, null, 'pending')
on conflict (id) do nothing;

-- ── sample venues under the sample venue vendor (addresses are fake) ───────
insert into public.venues
  (id, vendor_id, capacity_min, capacity_max, price_per_plate_veg, price_per_plate_nonveg,
   rental_price, indoor_outdoor, address, lat, lng)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001',
   100, 300, 450, 650, 40000, 'indoor',
   'Sample Address 1, Banda, Uttar Pradesh (FAKE)', 25.4836, 80.3396),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001',
   250, 600, 500, 750, 75000, 'both',
   'Sample Address 2, Banda, Uttar Pradesh (FAKE)', 25.4800, 80.3450),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001',
   50, 150, 400, 600, 25000, 'outdoor',
   'Sample Address 3, Banda, Uttar Pradesh (FAKE)', 25.4900, 80.3300)
on conflict (id) do nothing;
