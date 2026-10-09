# RLS test checklist (Phase 5 §13.4)

**Status: live-verified 29/29 (2026-10-04)** against the project's Supabase
instance — structure, signup trigger, storage, and all 13 behaviour tests ran
via role-impersonated SQL and passed. This file is the human-runnable version
of that suite; re-run it after any policy change.

Run in order: `supabase/migrations/0001_schema.sql` … `0006_least_privilege_anon.sql`,
then `supabase/seed.sql`. (Migrations are applied **once each** — `create
policy` is not idempotent; history is tracked in `public.schema_migrations`.)

## Setup (once)

1. **Promote your first admin** — sign up once with your phone, then run
   (SQL editor, as postgres — trusted roles bypass the guard trigger per
   migration 0005):

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users order by created_at limit 1);
   ```

   From then on, only admins can change roles (guard trigger + RLS).

2. **Create two test vendor users** — sign up twice (two phone numbers), then:

   ```sql
   update public.profiles set role = 'vendor'
     where id in (select id from auth.users order by created_at limit 2 offset 1);
   insert into public.vendors (id, owner_user_id, business_name, category, city, status)
   values
     (gen_random_uuid(), (select id from auth.users order by created_at limit 1 offset 1),
      'Vendor A (test)', 'decor', 'banda', 'approved'),
     (gen_random_uuid(), (select id from auth.users order by created_at limit 2 offset 1),
      'Vendor B (test)', 'decor', 'banda', 'approved');
   insert into public.leads (name, phone, assigned_vendor_id)
   select 'Lead for ' || business_name, '9800000000', id from public.vendors
   where business_name like 'Vendor%';
   ```

3. **How to impersonate in the SQL editor** — wrap each test in a transaction:

   ```sql
   begin;
   set local role authenticated;
   set local request.jwt.claims = '{"sub":"<user-uuid>","role":"authenticated"}';
   -- …test query…
   rollback;
   ```

   For anon: `set local role anon;` (no claims — `auth.uid()` is null).
   `SET LOCAL` is transaction-scoped, so a rollback/commit restores the role.

## Tests — every row must behave as stated

| # | Acting as | Action | Expected |
|---|-----------|--------|----------|
| 1 | anon | `select business_name from vendors` | Only `status='approved'` rows, never the pending one |
| 2 | anon | `select id from vendors where status='pending'` | 0 rows |
| 3 | anon | `select * from leads` | **permission denied** (least-privilege grant, migration 0006) |
| 4 | anon | `insert into leads (name, phone) values ('X','9999999999')` **(no RETURNING)** | Succeeds; row is `status='new'`, `assigned_vendor_id is null` |
| 4b | anon | same insert **with `returning` / `.select()`** | **RLS violation** — correct by design: anonymous leads are write-only, and RETURNING requires the SELECT policy to admit the row. **Stage 4 lead forms must insert without `.select()`** |
| 5 | anon | `insert into leads (name, phone, status) values ('X','9','contacted')` | **RLS violation** (with check) |
| 5b | anon | insert with `assigned_vendor_id` set | **RLS violation** (with check) |
| 6 | Vendor A | `select * from leads` | Only leads assigned to Vendor A — **never Vendor B's** (§13.4 core test) |
| 6b | Vendor A | `update leads set status=… where assigned to A` | **0 rows** — vendors READ assigned leads only (scope excludes them from updates; the trigger below is the second line of defence) |
| 7 | Customer A | `update leads set status='contacted'` on **their own** lead | **ERROR** — “Only an admin can change a lead status” (guard trigger) |
| 7b | Customer A | `update leads set assigned_vendor_id=…` on their own lead | **ERROR** — “Only an admin can assign a lead” |
| 7c | Customer A | `update leads set name=…` on their own lead | Succeeds (contact fields) |
| 8 | Vendor A | `update vendors set status='rejected'` (own row) | **ERROR** — “Only an admin can change a vendor status” |
| 8b | Vendor A | `update vendors set description=…` (own row) | Succeeds |
| 8c | Vendor A | `update vendors … where id=(Vendor B)` | **0 rows** |
| 9 | Customer A | `select * from profiles` | Own row only |
| 10 | Customer A | `update profiles set role='admin'` (own) | **ERROR** — “Only an admin can change a profile role” |
| 10b | Customer A | `update profiles set full_name=…` (own) | Succeeds |
| 11 | Customer A | `select * from leads` | Their own lead(s) only — never anonymous or other people's |
| 12 | Admin | lead status change, lead assignment, vendor approve/reject, promote role | All succeed |
| 13 | Admin | `select count(*) from leads` | Equals the table's real row count |

## Storage (verify when uploads are exercised; path must be `<vendor_id>/…`)

| # | Acting as | Action | Expected |
|---|-----------|--------|----------|
| S1 | anon | GET a `vendor-media` object URL | 200 (public bucket) |
| S2 | Vendor A | upload to `vendor-media/<vendor-A-id>/x.jpg` | Allowed |
| S3 | Vendor A | upload to `vendor-media/<vendor-B-id>/x.jpg` | **RLS/with-check error** |
| S4 | anon/authenticated | GET any `vendor-documents` object | **denied** (private bucket) |
| S5 | Admin | upload to any vendor's folder | Allowed (`is_admin()` branch) |

## Platform settings (dashboard — not SQL)

- **Auth → Rate limits**: keep resend ≈60 s, tune OTP attempts; OTP expiry default 1 h.
- **Auth → Spam protection**: enable Turnstile/hCaptcha for phone OTP (bots).
- **Postgres/Edge rate limiting** for anon lead inserts (spam vector — lead intake
  is anon by design until OTP-verified submission ships in Stage 4).
- **Send SMS hook activation**: deploy `supabase/functions/send-sms`
  (`--no-verify-jwt`), `supabase secrets set …`, then Dashboard → Authentication →
  Hooks → Send SMS (HTTP) → `https://<project-ref>.supabase.co/functions/v1/send-sms`.
  Full steps land in the README (Stage 6).

## Known design notes (not bugs)

- Seeded vendors have `owner_user_id = null` (no account exists for them).
- Signup trigger creates every profile as `customer`; vendor/admin roles are
  promoted manually (#1–2) or by an admin later.
- **Vendor role flow:** registering creates a `pending` vendor row while the
  user's role stays `customer`. On approval the admin panel does both
  (`vendors.status` → approved + owner `profiles.role` → `vendor`; rejection
  demotes only a `vendor` owner back to `customer`).
- **Trusted roles (migration 0005):** `postgres`, `service_role` and
  `supabase_admin` bypass the guard triggers exactly as they bypass RLS —
  otherwise the first-admin bootstrap and server-side code could never change
  roles/statuses.
- **Anonymous lead inserts must not use `RETURNING`/`.select()`** (test 4b):
  anon has no SELECT policy on `leads` by design, and `INSERT … RETURNING`
  re-checks the SELECT policy on the new row.
- `ideabook_items.media_id` has no FK — Ideas is skipped for now (§13.6).
