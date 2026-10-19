# Admin access & data storage

Two questions this answers: **how to become/act as an admin**, and **what to use to
store and manage the site's data**.

---

## 1. How admin access actually works

There is **no separate admin password or hidden route**. Admin is a *database role*:

```
auth.users  ──1:1──▶  public.profiles.role          ('customer' | 'vendor' | 'admin')
                            │
                            ▼
              public.is_admin()  ──▶  RLS on every table
                            │
                            ▼
        middleware.ts + requireAuth()  ──▶  /admin/*
```

Concretely, four independent gates must all pass:

| Layer | Where | What it checks |
|---|---|---|
| 1. Session | `src/middleware.ts` | valid Supabase session cookie, else `307 → /login?next=…` |
| 2. Role (edge) | `middleware.ts` → `getRole()` | `profiles.role === 'admin'` for `/admin/*` |
| 3. Role (server) | `requireAuth({ roles: ['admin'] })` in `src/pages/admin/dashboard.tsx` | same check again, so a middleware bypass still fails |
| 4. Row Level Security | `supabase/migrations/0002_rls.sql` | `public.is_admin()` gates every write and every non-public read |

Layers 2–4 all read the **same** `profiles.role` column, so the only thing that makes
someone an admin is that row. Nothing in the frontend can grant it — which is the
point: `is_admin()` is `SECURITY DEFINER` with `search_path = ''`, and a guard trigger
(`profiles: role change is admin-only`) blocks any non-admin from editing `role`,
even for their own row.

### The two accounts that are admins right now

| Account | Role |
|---|---|
| `shivanshusahu.bnd@gmail.com` | **admin** |
| `devadmin@vantara.local` | **admin** |
| `picturesquare.jhansi@gmail.com` | customer |

### Step-by-step: make yourself (or anyone) an admin

**Step 0 — sign in once.** The user must exist in `auth.users` before they can have a
profile. Phone OTP is currently disabled on this Supabase project and email is
rate-limited, so use an **admin-minted magic link** (no email is sent, so no quota is
used). Ask a developer to generate one, or do it yourself in the Supabase dashboard:
*Authentication → Users → ⋯ → Generate magic link*, then open the link.

**Step 1 — find their user id.**

```sql
select id, email, phone, created_at
from auth.users
order by created_at;
```

**Step 2 — promote them.** Run in the Supabase **SQL Editor** (or psql with the
database URL). `profiles` has a signup trigger, so a row usually already exists:

```sql
-- promote an existing profile
update public.profiles
   set role = 'admin'
 where id = '<AUTH_USER_ID>';

-- if the profile row is missing (user signed up before the trigger existed)
insert into public.profiles (id, role, full_name)
values ('<AUTH_USER_ID>', 'admin', 'Your Name')
on conflict (id) do update set role = 'admin';
```

**Step 3 — verify.**

```sql
select p.id, u.email, p.role
from public.profiles p
join auth.users u on u.id = p.id
order by p.role desc;
```

**Step 4 — sign in and open the panel.** `GET /admin/dashboard`. The middleware reads
`profiles.role` per request, so no redeploy or restart is needed — the new role applies
on the next request.

> The SQL Editor runs as `postgres`, which is a *trusted* role, so the admin-only guard
> trigger does not block it (migration `0005` made trusted roles bypass guard triggers
> precisely so the documented first-admin bootstrap works).

### While you cannot sign in at all

Two independent blockers exist on this project and both are Supabase settings, not code:

1. **Phone OTP is disabled** — `/auth/v1/settings` reports `phone: false`,
   `sms provider: false`, so any SMS request returns
   `400 Unsupported phone provider`. Fix: deploy the Send SMS hook
   (`supabase/functions/send-sms/`, MSG91) and enable
   *Authentication → Providers → Phone*.
2. **Email is rate limited** — Supabase's built-in sender is heavily throttled
   (`429 over_email_send_rate_limit`). Fix: add your own SMTP under
   *Authentication → Emails → SMTP Settings*, or keep using admin-minted links.

Until then the **admin-minted magic link** is the reliable way in.

### What an admin can do

`/admin/dashboard` has eight tabs:

- **CRM** — Leads (search, status, assign to vendor), Vendors (approve/reject, CRUD,
  photos), Bookings (commission summary)
- **CMS** — Site Settings (branding, contacts, socials, SEO), Hero Videos, FAQs, Pages,
  Media Library

Every media field in the CMS has a **Choose / Upload** button (library, upload, or
external CDN URL), so images and hero videos are changed without touching code.

---

## 2. Recommended open-source stack for storing & managing the data

The project already sits on the right foundation — **PostgreSQL with Row Level
Security**. The question is whether to keep the hosted service or self-host.

### Recommendation: keep Supabase, and self-host it (open source) when you outgrow the free tier

**Supabase is open source** (Apache-2.0): Postgres + GoTrue (auth) + PostgREST (API) +
Storage + Studio (admin UI) + Realtime. You are not locked in — the whole stack can be
run with Docker Compose on your own server, and the database is plain Postgres that any
tool can read.

| Need | Use | Why |
|---|---|---|
| **Database** | **PostgreSQL 16** (already in use) | open source, the schema/RLS you already have |
| **Auth (phone OTP / email)** | **Supabase GoTrue** | OSS; already integrated; Indian SMS via MSG91 hook |
| **REST/Auto API** | **PostgREST** (bundled) | OSS, sits on Postgres, respects RLS |
| **File storage (images/videos)** | **Supabase Storage** (OSS) — or **MinIO / Garage** if self-hosting | S3-compatible, public-read buckets already configured |
| **Admin UI / SQL client** | **Supabase Studio** (bundled) or **pgAdmin / DBeaver** | view and edit rows, run SQL |
| **Self-host everything** | `docker compose` from [github.com/supabase/supabase](https://github.com/supabase/supabase) | same code you use hosted |
| **Backups** | `pg_dump` cron + `restic`/`rclone` for storage | open source, scriptable |

**Why not build something else:** the schema, 7 migrations, RLS policies and 29 passing
RLS tests already encode your business rules (vendors see only their leads, anon sees
only approved vendors, admins see everything). Moving to another store would mean
rebuilding all of that. Postgres + RLS is the correct open-source answer, and you are on
it already.

**When to self-host:** if data-residency (India) or egress cost becomes an issue. A
₹500–1500/month VPS runs the whole Supabase stack; `docker compose up` plus
`pg_dump`/`pg_restore` migrates you there. The app needs only two env values changed
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

**One caveat about media:** the ~600 MB of images and videos are currently served from
the git repo / Vercel, *not* Supabase Storage. That is fine at this size, but for real
traffic move them to **Supabase Storage, MinIO, or a CDN (Cloudflare R2 has a free
tier)** — see `docs/perf-report.md`.
