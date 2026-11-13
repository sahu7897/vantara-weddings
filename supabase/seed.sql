-- ═══════════════════════════════════════════════════════════════════════════
-- Vantara Weddings — Phase 5 seed data (§13.8)
-- Starter catalogue data for local development. Replace with approved vendors before launch; every venue
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

-- ── localities ──
insert into public.localities (city_slug, slug, name) values
  ('lucknow',   'hazratganj',  'Hazratganj'),
  ('lucknow',   'gomti-nagar', 'Gomti Nagar'),
  ('delhi-ncr', 'saket',       'Saket'),
  ('delhi-ncr', 'karol-bagh',  'Karol Bagh'),
  ('jhansi',    'civil-lines', 'Civil Lines')
on conflict (slug) do nothing;

-- ── vendors (owner null = not linked to any account yet) ─────────────────
insert into public.vendors
  (id, owner_user_id, business_name, category, city, locality, description, price_min, price_max, status)
values
  ('00000000-0000-4000-8000-000000000001', null,
   'Shubham Banquet Hall, Banda', 'venue', 'banda', 'Civil Lines',
   'Banquet hall with flexible indoor seating for family weddings and receptions.',
   50000, 250000, 'approved'),
  ('00000000-0000-4000-8000-000000000002', null,
   'Royal Petal Decorators, Banda', 'decor', 'banda', 'Civil Lines',
   'Floral, mandap and stage decoration for weddings, engagements and receptions.',
   15000, 80000, 'approved'),
  ('00000000-0000-4000-8000-000000000003', null,
   'Lens & Lore Wedding Photography, Banda', 'photography', 'banda', 'Civil Lines',
   'Candid and traditional wedding photography with cinematic video coverage.',
   20000, 100000, 'approved'),
  ('00000000-0000-4000-8000-000000000004', null,
   'Mandap Mantra Decor, Jhansi', 'decor', 'jhansi', 'Civil Lines',
   'Decor studio offering mandap, floral and stage styling for weddings.',
   null, null, 'pending')
on conflict (id) do nothing;

-- ── venues under the Banda banquet vendor ────────────────────────────────
insert into public.venues
  (id, vendor_id, capacity_min, capacity_max, price_per_plate_veg, price_per_plate_nonveg,
   rental_price, indoor_outdoor, address, lat, lng)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001',
   100, 300, 450, 650, 40000, 'indoor',
   'Civil Lines, Banda, Uttar Pradesh 210001', 25.4836, 80.3396),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001',
   250, 600, 500, 750, 75000, 'both',
   'Nahar Road, Banda, Uttar Pradesh 210001', 25.4800, 80.3450),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001',
   50, 150, 400, 600, 25000, 'outdoor',
   'Kalinjar Road, Banda, Uttar Pradesh 210001', 25.4900, 80.3300)
on conflict (id) do nothing;
