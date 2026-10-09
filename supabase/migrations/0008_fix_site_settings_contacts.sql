-- ═══════════════════════════════════════════════════════════════════════════
-- Vantara Weddings — 0008: correct the live site_settings seed values.
--
-- WHY THIS IS NEEDED
-- Migration 0007 seeded `site_settings` with *placeholder* contact details
-- (phone +91 95381 27163, WhatsApp 919538127163, support@vantaraweddings.com,
-- address "Delhi NCR / Bengaluru / Rajasthan") and placeholder socials.
--
-- Until Phase 6, nothing read those rows, so the placeholders were harmless.
-- Now that the public site reads them (`_app.getInitialProps` ->
-- `loadEffectiveSiteSettings`), a row that exists *overrides* the real values
-- in `src/config/site.ts`. On an already-migrated project that means the live
-- footer/WhatsApp CTAs would show the old number again even though the code is
-- correct — the classic "fixed the code, forgot the data" split.
--
-- This migration aligns the stored rows with the client-supplied brand details.
-- It is written to be safe to run on a fresh project too (plain upserts).
--
-- NOTE: the app is already resilient to this class of drift — blank/omitted
-- fields fall back to src/config/site.ts rather than blanking the page (see
-- withoutBlanks() in src/lib/cms/loadSiteSettings.ts) — but an explicitly
-- stored WRONG value is indistinguishable from a deliberate one, which is why
-- the data itself has to be corrected here.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── contacts ────────────────────────────────────────────────────────────────
insert into public.site_settings (key, value, description)
values (
  'contacts',
  '{
    "phone": "+91 73551 91261",
    "telHref": "tel:+917355191261",
    "whatsappNumber": "917355191261",
    "whatsappText": "Hey, I am looking for wedding services",
    "email": "bookings@vantaraweddings.com",
    "address": "B Block, 1325/31, Nahar Road, Awas Vikas Colony, Indira Nagar, Banda, Uttar Pradesh 210001"
  }'::jsonb,
  'Customer support contact channels'
)
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description,
  updated_at = now();

-- ── socials ─────────────────────────────────────────────────────────────────
insert into public.site_settings (key, value, description)
values (
  'socials',
  '{
    "instagram": "https://www.instagram.com/vantaraweddings/",
    "facebook": "https://www.facebook.com/share/1DQbAP4Qb3/",
    "youtube": "https://youtube.com/@vantaraweddings",
    "linkedin": "https://www.linkedin.com/in/vantara-weddings-ba36a2407",
    "x": ""
  }'::jsonb,
  'Social profile links'
)
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description,
  updated_at = now();

-- ── seo ─────────────────────────────────────────────────────────────────────
insert into public.site_settings (key, value, description)
values (
  'seo',
  '{
    "defaultTitle": "Vantara Weddings - Book Venues, End to End Wedding Services, Planners in India",
    "defaultDescription": "Vantara Weddings provides the best wedding services in India. Book end-to-end wedding planning services online with us and grab the best deals for your wedding, engagement, reception, and other events.",
    "defaultOgImage": "/brand/vantara-logo.png"
  }'::jsonb,
  'Global fallback SEO meta tags'
)
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description,
  updated_at = now();

-- ── general ─────────────────────────────────────────────────────────────────
-- `logoUrl` must be an asset that actually exists in the repo: 0007 pointed at
-- /brand/vantara-logo.png, which is present, so only the tagline is refreshed.
insert into public.site_settings (key, value, description)
values (
  'general',
  '{
    "name": "Vantara Weddings",
    "shortName": "Vantara",
    "tagline": "Book Venues, End to End Wedding Services, Planners in India",
    "logoUrl": "/brand/vantara-logo.png",
    "faviconUrl": "/brand/favicon.png"
  }'::jsonb,
  'Main brand identity settings'
)
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description,
  updated_at = now();

-- ── verification ────────────────────────────────────────────────────────────
-- Expect the real number/email (never 95381… or theweddingcompany.com):
--   select key, value->>'phone' as phone, value->>'email' as email
--   from public.site_settings where key = 'contacts';
do $$
declare
  c jsonb;
begin
  select value into c from public.site_settings where key = 'contacts';
  if c is null then
    raise exception '0008: contacts row missing after upsert';
  end if;
  if coalesce(c->>'whatsappNumber', '') = '' then
    raise exception '0008: whatsappNumber is empty — public CTAs would lose their target';
  end if;
  if c->>'email' ilike '%theweddingcompany%' then
    raise exception '0008: contacts.email still points at the old domain';
  end if;
  raise notice '0008 OK — contacts: % / %', c->>'phone', c->>'email';
end $$;
