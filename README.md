# Vantara Weddings

Wedding planning platform for **Vantara Weddings** — venue/vendor directory, enquiry funnel and
admin CMS. Built as a brand adaptation of the original theweddingcompany.com design.

📖 **Read `docs/BLUEPRINT.md` first** — architecture, route map, API map, stage log and the
running progress record (§13.10). It is the source of truth for *why* things are the way they are.

## Stack

- **Next.js 15** (pages router) + TypeScript, hosted on **Vercel**
- **Supabase** — Postgres + RLS, Auth (phone OTP / magic link / Google), Storage
- Tailwind CSS with the original design tokens (`tailwind.config.ts` — extracted, not guessed)
- `next/font`: Lato, Playfair Display, Plus Jakarta Sans, Poppins, Moisette
- **SMS provider:** MSG91 via the Supabase *Send SMS* hook (`supabase/functions/send-sms/`)

Static export is **not** used (Phase 5 §13.1 / O1) — the app relies on middleware,
`getServerSideProps` and ISR.

## Commands (Windows note)

PowerShell blocks `npm.ps1` — always use **`npm.cmd`** (or run from cmd):

```bash
npm.cmd install
npm.cmd run dev        # http://localhost:3000
npm.cmd run build      # production build
npm.cmd run lint       # eslint . --max-warnings 0  (zero warnings allowed)
npm.cmd run typecheck  # tsc --noEmit
npm.cmd run format     # prettier
```

`lint` and `typecheck` are hard gates: both must exit 0 before committing.

## Environment

Copy `.env.example` → `.env.local`:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public, RLS-scoped) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only.** Never import into client code |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (localhost or the Vercel domain) |
| `MSG91_*` | SMS provider secrets — set as Edge Function secrets, not in Next.js |

## Database

Migrations live in `supabase/migrations/` and are applied in order:

| File | Contents |
|---|---|
| `0001_schema.sql` | profiles, vendors, venues, vendor_media, cities, localities, leads, bookings, ideabook_items + indexes + signup trigger |
| `0002_rls.sql` | RLS on every table, `is_admin()` security-definer helper, per-role policies, guard triggers |
| `0003_storage.sql` | `vendor-media` (public read) + `vendor-documents` (private) buckets and policies |
| `0004` / `0005` / `0006` | Live-verification fixes: missing documents UPDATE policy, trusted-role bypass, least-privilege anon grants |
| `0007_cms_schema.sql` | CMS: `site_settings`, `cms_pages`, `cms_sections`, `cms_menus`, `cms_media` + `site-media` bucket |
| `0008_fix_site_settings_contacts.sql` | Corrects the placeholder contacts/socials seeded by 0007 |

`supabase/seed.sql` seeds cities/localities and clearly-marked **FAKE** sample vendors and venues.
Run `docs/rls-test-checklist.md` after applying migrations — it documents the impersonation tests
that prove each policy.

## Content management (admin CMS)

`/admin/dashboard` (admin role only) has two halves:

- **CRM** — Leads (search/filter/assign/status), Vendors (approval queue + CRUD + media), Bookings
  (commission summary). All writes go through the admin's own session; RLS is the access control
  and the service-role key never reaches the browser.
- **CMS** — Site Settings (branding/contacts/socials/SEO), Hero Videos, FAQs, Pages, Media.

The CMS is **read back by the public site**: `_app.getInitialProps` loads the effective
`site_settings` rows and publishes them via `useSiteSettings()`, and the homepage reads its
`cms_sections` rows. Editing a value in the admin panel changes the live header, footer, WhatsApp
CTAs and homepage sections (ISR, `revalidate: 300`).

**Fallback order:** `site_settings` row → `src/config/site.ts`. Blank/omitted CMS fields fall back
rather than blanking a page — so a wrong *stored* value must be fixed in the data, not the code.

## Brand values

Real contacts, address and social URLs live in **`src/config/site.ts`** (and are mirrored in
migration `0008` for the hosted database). Never hardcode a phone number, email or social URL in a
component — read from `useSiteSettings()` or `site.ts`. WhatsApp links must be built with
`buildWhatsappUrl()` (`src/lib/site/whatsapp.ts`).

## Stage status

Phase 5/6 per BLUEPRINT §13.9–§13.10:

1. ✅ Supabase client + auth
2. ✅ Migrations + RLS (live-verified, 29/29 tests)
3. ✅ Admin panel (CRM + CMS)
4. ✅ Public pages on real data (directory, venue detail, legal/content pages)
5. ✅ Vendor panel (profile + media + leads + bookings)
6. ⬜ Deploy checklist (Vercel + SMS provider + domain)

## Rules

- The original capture folder (`../www.theweddingcompany.com/`) is **read-only** — never modify.
- **No fake functionality:** missing credentials disable a feature with a visible notice, never with
  invented data. Empty states are explicit ("No venues yet in this city").
- **No TWC endpoints** may be called from app code (Phase 5 §13.1 / O2), and no live-site scraping.
- Never hardcode secrets; `.env.local` and Vercel env vars only.
