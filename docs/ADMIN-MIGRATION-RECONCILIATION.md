# Admin rollout — migration reconciliation (read-only findings + runbook)

Status: **investigation complete, no production change made.** Nothing in this
document has been executed against the live database. Ledger repair, applying
`0011`, and Super Admin provisioning all require explicit owner approval.

Project inspected: `supabase-coffee-cloud` (`efmavxkqkwrcyqnbfjks`), confirmed to
hold the Vantara schema. All evidence below came from read-only queries.

---

## 1. Why `supabase db push --linked` failed

The project has **two migration ledgers**, and they disagree.

| Ledger | Used by | Rows present |
| --- | --- | --- |
| `public.schema_migrations` | the project's original psycopg2 runner (see `docs/BLUEPRINT.md`) | `0001`–`0007` |
| `supabase_migrations.schema_migrations` | the Supabase CLI (`db push`) | `0001` only |

The CLI ignores `public.schema_migrations`, so it believed the database was
empty and queued `0001`–`0008`. `0001` is written with `if not exists`, so it
re-applied harmlessly. `0002_rls.sql` uses bare `create policy`, which is not
idempotent — it stopped on the first policy that already existed:

```
ERROR: policy "profiles: own or admin reads" for table "profiles" already exists
```

That is a **ledger/bookkeeping divergence, not a broken schema.**

### Secondary cause: wrong directory

`db push` was run from the old local folder
`C:\Users\MODI\OneDrive\Desktop\vantara-weddings-main\vantara-weddings-main`,
which only contains `0001`–`0008` and has no `0011_admin_access.sql`. The
"Apply these migrations" list (`0001`–`0008`) confirms it. Any future migration
command must run from the feature-branch checkout, which carries `0001`–`0011`.

---

## 2. Live schema vs. migrations (verified)

Live object counts:

- 15 tables in `public`
- 58 policies across `public` + `storage`, matching the 58 `create policy`
  statements in `0002`/`0003`/`0004`/`0007` exactly, per table
- 5 functions: `is_admin`, `handle_new_user`, `guard_profile_role`,
  `guard_vendor_status`, `guard_lead_pipeline`
- Triggers enabled: `on_auth_user_created` (auth), plus the three guard triggers
- 3 storage buckets: `site-media`, `vendor-documents`, `vendor-media`
- `anon` holds **no** table grants, matching `0006_least_privilege_anon.sql`
- RLS enabled on every public table present

| Migration | Physically applied? | Evidence |
| --- | --- | --- |
| `0001`–`0007` | **Yes** | all tables/policies/functions/triggers/buckets present; recorded in the legacy ledger |
| `0008` | **Yes** | `site_settings.contacts` = `bookings@vantaraweddings.com` / `+91 73551 91261` (corrected values, not `0007`'s placeholders) |
| `0009` | **Yes** (same effect as `0010`) | `general.logoUrl = /brand/vantara-logo-transparent.svg` |
| `0010` | **Yes** | same `logoUrl`; demo vendors/venues (`…0001`–`…0004`, `…0101`–`…0103`) all absent |
| `0011` | **No** | `admin_access_credentials`, `admin_login_throttle`, `admin_login_is_limited` are all absent |

`0009` and `0010` set an identical `logoUrl`, so their individual history cannot
be distinguished — and does not need to be.

### Data integrity after the failed push

The re-run of `0001` executed its only destructive statement,
`drop trigger if exists on_auth_user_created on auth.users`, and recreated the
trigger. It is present and enabled. `0001` contains no `delete`, `truncate`,
`drop table`, or `drop column`. Row counts are intact:

| profiles | vendors | venues | leads | bookings | site_settings | cms_pages | cms_sections |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | 0 | 0 | 8 | 0 | 4 | 7 | 4 |

**No data was lost.**

---

## 3. Security review of the admin auth path

Reviewed `src/middleware.ts`, `src/lib/auth/admin-ticket*.ts`,
`src/pages/api/auth/admin/*.ts`, `scripts/bootstrap-super-admin.js`, and
`supabase/migrations/0011_admin_access.sql`.

Sound:

- Session ticket is HMAC-SHA256 signed, compared with `timingSafeEqual`,
  expires in 8h, and is `httpOnly` + `sameSite=strict` + `secure` in production.
- `ADMIN_SESSION_SECRET` under 32 chars fails closed with `503` before any work.
- Passwords use `scrypt` (N=32768) with a per-user random salt; only hex salt and
  hash are stored. Plaintext is never persisted or logged.
- Login is throttled through `admin_login_throttle`, keyed by an HMAC of the
  client address, and the counter is cleared only after a fully successful login.
- Wrong-credential paths return an identical generic `401`; `scrypt` also runs on
  non-matching input so response time does not reveal username existence.
- `0011` revokes the credential and throttle tables from `public`/`anon`/
  `authenticated` and grants them only to `service_role`.
- Middleware requires **both** a valid ticket and a matching Supabase session whose
  profile role is `admin`; a mismatch clears the ticket and forces re-auth.
- Bootstrap is one-time (refuses if any credential row exists) and rolls back the
  created auth user if a later step fails.

Follow-ups (not blocking rollout, need approval before any change):

1. `scripts/mint-admin-link.js` and `scripts/set-admin-password.js` predate this
   work and are unused by it. Confirm they are not part of the production
   workflow, or remove them in a follow-up.
2. `public.schema_migrations` becomes redundant once the CLI ledger is
   authoritative. Dropping it is a production change and should be a separate,
   approved decision.

---

## 4. Required environment variables

Server-side (Vercel → Project → Settings → Environment Variables, Preview and
Production). Values were **not** read or verified — the Vercel integration is not
available in this session.

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | already required by the existing app |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | already required by the existing app |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | must never carry a `NEXT_PUBLIC_` prefix |
| `ADMIN_SESSION_SECRET` | **server only** | ≥ 32 chars; `openssl rand -base64 48` |
| `NEXT_PUBLIC_SITE_URL` | public | existing; set to the deployed origin |

`.env.example` already documents these; no change was needed.

---

## 5. Runbook (each step needs owner approval)

Run everything from the **feature-branch checkout**, not the old local folder.

**Step 1 — re-confirm state (read-only, safe anytime).**

```sql
select version, name from supabase_migrations.schema_migrations order by version;
select to_regclass('public.admin_access_credentials') as creds,
       to_regclass('public.admin_login_throttle')    as throttle;
select key, value->>'logoUrl' as logo_url from public.site_settings where key='general';
select key, value->>'email'   as email    from public.site_settings where key='contacts';
```

Expected before repair: CLI ledger shows only `0001`; both `to_regclass` results
are `null`; logo is the transparent SVG; email is
`bookings@vantaraweddings.com`.

If any of those data checks is **unexpected**, stop and apply that specific
migration's SQL by hand instead of repairing the ledger.

**Step 2 — repair the CLI ledger so it matches the verified schema.**

```bash
npx supabase migration repair --status applied 0002 0003 0004 0005 0006 0007 0008 0009 0010
```

This writes ledger rows only; it runs no DDL. `0001` is already recorded.

**Step 3 — dry-run, then push the single remaining migration.**

```bash
npx supabase db push --dry-run      # expect exactly one: 0011_admin_access.sql
npx supabase db push
```

Then confirm the three `0011` objects exist and that `anon`/`authenticated` hold
no grants on them.

**Step 4 — provision the Super Admin (one time).**

```bash
node scripts/bootstrap-super-admin.js
```

Run from a trusted machine with `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` in the shell environment. It prints the generated
username/password exactly once — store them in a password manager immediately.
The account is unusable until `ADMIN_SESSION_SECRET` is set in Vercel, because
the login route returns `503` without it.

**Step 5 — verify end to end.** Wrong password → generic `401`; eight failures →
`429` for 15 minutes; correct credentials → `/admin/dashboard`; sign-out clears
both the ticket and the Supabase session; `/admin/dashboard` redirects to
`/admin/login` when signed out.

---

## 6. Rollback

- Steps 2–3 are additive. To undo the ledger entry:
  `npx supabase migration repair --status reverted 0011`.
- `0011` only **creates** two tables and three functions. Reverting means
  `drop table public.admin_login_throttle, public.admin_access_credentials;` and
  dropping the three functions. No existing data is touched.
- If the Super Admin must be removed: delete the `admin_access_credentials` row,
  then delete the corresponding `auth.users` row (its `profiles` row cascades).
