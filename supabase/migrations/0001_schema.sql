-- ═══════════════════════════════════════════════════════════════════════════
-- Vantara Weddings — Phase 5, Stage 2: schema
-- 0001_schema.sql — core tables, indexes, signup trigger.
-- Apply on the Supabase project (SQL editor or `supabase db push`).
-- Conventions: uuid PKs (gen_random_uuid is built into PG 13+), timestamptz.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── profiles: one row per auth user; role lives here (§13.2) ────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'customer'
              check (role in ('customer', 'vendor', 'admin')),
  full_name   text,
  phone       text,
  city        text,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Phase 5 §13.2: role column — new signups default to customer (signup trigger); '
  'only an admin may change a role (guard trigger in 0002).';

-- ── vendors: the vendor network (§13.3) ─────────────────────────────────────
-- owner_user_id is nullable ON PURPOSE: seed- and admin-created vendor rows may
-- have no linked account yet; a registered vendor always gets their own id via
-- the registration flow (owner_user_id = auth.uid() under RLS).
create table if not exists public.vendors (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   uuid references public.profiles (id) on delete set null,
  business_name   text not null,
  category        text not null
                  check (category in ('venue','decor','photography','catering','makeup','dj','other')),
  city            text not null,          -- matches public.cities.slug (no FK: keeps admin edits flexible)
  locality        text,
  description     text,
  price_min       numeric(12,2),
  price_max       numeric(12,2),
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  created_at      timestamptz not null default now(),
  check (price_min is null or price_max is null or price_max >= price_min)
);

-- ── venues: venue-specific detail rows (one per venue vendor) ───────────────
create table if not exists public.venues (
  id                     uuid primary key default gen_random_uuid(),
  vendor_id              uuid not null references public.vendors (id) on delete cascade,
  capacity_min           int,
  capacity_max           int,
  price_per_plate_veg    numeric(10,2),
  price_per_plate_nonveg numeric(10,2),
  rental_price           numeric(12,2),
  indoor_outdoor         text
                         check (indoor_outdoor is null or indoor_outdoor in ('indoor','outdoor','both')),
  address                text,
  lat                    double precision check (lat is null or lat between -90 and 90),
  lng                    double precision check (lng is null or lng between -180 and 180),
  created_at             timestamptz not null default now(),
  check (capacity_min is null or capacity_max is null or capacity_max >= capacity_min)
);

-- ── vendor_media: rows describing files inside the vendor-media bucket ──────
create table if not exists public.vendor_media (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid not null references public.vendors (id) on delete cascade,
  storage_path text not null,            -- bucket path, convention: <vendor_id>/<file>
  alt_text     text,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  unique (vendor_id, storage_path)
);

-- ── cities / localities: directory navigation (seeded: Banda, Jhansi, …) ────
create table if not exists public.cities (
  slug       text primary key,
  name       text not null,
  state      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.localities (
  id         uuid primary key default gen_random_uuid(),
  city_slug  text not null references public.cities (slug) on delete cascade,
  slug       text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

-- ── leads: enquiries from public forms (§13.3, §13.6) ──────────────────────
create table if not exists public.leads (
  id                 uuid primary key default gen_random_uuid(),
  customer_id        uuid references public.profiles (id) on delete set null, -- null = anonymous enquiry
  name               text not null,
  phone              text not null,
  city               text,
  event_date         date,
  budget_range       text,
  guest_count        int,
  services_needed    text[],
  source_page        text,
  status             text not null default 'new'
                     check (status in ('new','contacted','qualified','booked','lost')),
  assigned_vendor_id uuid references public.vendors (id) on delete set null,
  created_at         timestamptz not null default now()
);

-- ── bookings: confirmed work + commission (§13.3, §13.7) ────────────────────
create table if not exists public.bookings (
  id                 uuid primary key default gen_random_uuid(),
  lead_id            uuid references public.leads (id) on delete set null,
  vendor_id          uuid not null references public.vendors (id) on delete cascade,
  event_date         date not null,
  amount             numeric(12,2) not null,
  commission_percent numeric(5,2) not null default 0
                     check (commission_percent between 0 and 100),
  commission_amount  numeric(12,2) not null default 0,
  status             text not null default 'pending'
                     check (status in ('pending','confirmed','completed','cancelled')),
  created_at         timestamptz not null default now()
);

-- ── ideabook_items: kept per §13.3, inert while Ideas is skipped (§13.6) ───
create table if not exists public.ideabook_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  media_id   uuid not null,              -- no FK: ideas tables deferred with the Ideas feature
  created_at timestamptz not null default now(),
  unique (user_id, media_id)
);

-- ── indexes (city / category / status + relation lookups) ───────────────────
create index if not exists idx_vendors_status_city_category on public.vendors (status, city, category);
create index if not exists idx_vendors_city                 on public.vendors (city);
create index if not exists idx_vendors_category             on public.vendors (category);
create index if not exists idx_vendors_status               on public.vendors (status);
create index if not exists idx_vendors_owner                on public.vendors (owner_user_id);
create index if not exists idx_venues_vendor                on public.venues (vendor_id);
create index if not exists idx_vendor_media_vendor          on public.vendor_media (vendor_id, sort_order);
create index if not exists idx_localities_city              on public.localities (city_slug);
create index if not exists idx_leads_city                   on public.leads (city);
create index if not exists idx_leads_status                 on public.leads (status);
create index if not exists idx_leads_customer               on public.leads (customer_id);
create index if not exists idx_leads_assigned_vendor        on public.leads (assigned_vendor_id);
create index if not exists idx_leads_created_at             on public.leads (created_at desc);
create index if not exists idx_bookings_vendor              on public.bookings (vendor_id);
create index if not exists idx_bookings_lead                on public.bookings (lead_id);
create index if not exists idx_bookings_status              on public.bookings (status);

-- ── signup trigger: new auth user → profile with role 'customer' ────────────
-- SECURITY DEFINER: Supabase Auth writes auth.users as supabase_auth_admin,
-- which has no INSERT on public.profiles by default.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, phone, full_name)
  values (new.id, new.phone, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
