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

---

<!-- BEGIN:SMTP-SMS-RUNBOOK -->
## 3. Fixing sign-in: SMTP (email) and SMS (phone OTP)

Both remaining sign-in blockers are **Supabase project settings**, not application
bugs. Nothing here requires a code change, and none of it weakens RLS, the admin
role check, or the middleware — sign-in decides *who you are*; RLS still decides
*what you may read or write*.

### Current live state (measured, not assumed)

| Check | Result | Meaning |
|---|---|---|
| `external.email` | `true` | email provider is on |
| `POST /auth/v1/otp` (email) | `429 over_email_send_rate_limit` | built-in sender quota exhausted |
| `external.phone` | `false` | **phone sign-in disabled** |
| `POST /auth/v1/otp` (phone) | `422 otp_disabled` | no SMS provider wired up |
| `POST /auth/v1/admin/generate_link` | `200` | **works today**, sends no email |

Diagnose it yourself at any time (reads only, no secrets printed):

```bash
# with $SUPABASE_URL and an anon key
curl -s "$SUPABASE_URL/auth/v1/settings" -H "apikey: $ANON_KEY"
```

### 3.1 Email — add your own SMTP (fixes the 429 permanently)

Supabase's built-in sender is rate limited on purpose (it is a demo sender, and its
deliverability is poor). Use a real transactional provider.

**Dashboard → Authentication → Emails → SMTP Settings → Enable custom SMTP**

| Field | Value |
|---|---|
| Host | provider's SMTP host (e.g. `smtp.resend.com`) |
| Port | `587` (STARTTLS) or `465` (implicit TLS) |
| Username | provider-specific (Resend uses the literal `resend`) |
| Password | your **SMTP API key** |
| Sender email | a domain you have verified with the provider |
| Sender name | `Vantara Weddings` |

Then raise **Rate limits → Emails per hour** to a value your plan allows.

**Security rules — do not break these**

- The SMTP password is a **secret**. Put it only in the Supabase dashboard. Never in
  `.env.local`, never in `NEXT_PUBLIC_*`, never in git, never in a commit message.
- Verify the sending domain (SPF + DKIM) before going live. Unverified domains land
  in spam, which looks like "login is broken" to customers.
- Keep **public customer signup enabled** (it is: `disable_signup: false`). Restricting
  who may *sign up* is not what protects the admin panel — the role check + RLS are.
- Do not disable email confirmations to "make testing faster"; it lets anyone claim any
  address. Confirmation is what makes an email address trustworthy.

### 3.2 Phone OTP — MSG91 via the Supabase Send SMS Hook

Phone sign-in must not be enabled until a provider is wired up, otherwise every
attempt fails with `otp_disabled` / "Unsupported phone provider" (the login page now
explains this instead of showing the raw error).

**Step 1 — provider account (India specifics)**

MSG91 is the recommended default for India because it is DLT-native. You need:

1. An MSG91 account with **DLT registration** (TRAI requirement for transactional SMS).
2. A **sender ID** approved on the DLT portal.
3. An **OTP template** approved on the DLT portal. The message body must contain
   `##OTP##` where the code goes.
4. An **Auth Key** from MSG91.

**Step 2 — deploy the hook** (the function already exists in this repo)

```bash
supabase login
supabase link --project-ref <your-project-ref>

# secrets live ONLY in Supabase, never in the repo
supabase secrets set \
  MSG91_AUTH_KEY=<auth-key> \
  MSG91_SENDER_ID=<dlt-sender-id> \
  MSG91_DLT_TEMPLATE_ID=<dlt-template-id>

supabase functions deploy send-sms --no-verify-jwt
```

`--no-verify-jwt` is expected here: Supabase calls the hook itself and authenticates
with the hook's own signature, which the function verifies. Do not add the service-role
key to the function's environment.

**Step 3 — register the hook**

Dashboard → **Authentication → Hooks → Send SMS** → select the `send-sms` Edge
Function and copy the **hook secret** it shows you into the function's secrets.

**Step 4 — enable the provider**

Dashboard → **Authentication → Providers → Phone** → enable. Then set
**Rate limits → SMS per hour** to something sane for your budget (SMS costs money per
message; this is also your abuse control).

**Step 5 — verify**

```bash
curl -s "$SUPABASE_URL/auth/v1/settings" -H "apikey: $ANON_KEY" \
  | grep -o '"phone":[a-z]*'          # expect "phone":true
```

Then sign in with a real Indian mobile. **Nothing about RLS or the admin role changes**
— the phone number only proves identity; `profiles.role` still decides access.

### 3.3 Order of operations (recommended)

1. Add SMTP and confirm email sign-in works. ← fixes the immediate 429
2. Promote your own account to `admin` (section 1) if it is not already.
3. Only then enable phone OTP, so you are not debugging two providers at once.
4. Keep `generate_link` as the break-glass path for admins:

```bash
# server-side only; sends no email, so it never hits the email quota
curl -s -X POST "$SUPABASE_URL/auth/v1/admin/generate_link" \
  -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"magiclink","email":"you@example.com"}'
# open: https://your-site/auth/callback?token_hash=<hashed_token>&type=magiclink
```

`SERVICE_ROLE_KEY` bypasses RLS by design. Keep it server-side only and never inline
it in a browser, a commit, or a client bundle.

### 3.4 What NOT to do

| Tempting shortcut | Why it is wrong |
|---|---|
| Put the service-role key in `NEXT_PUBLIC_*` | ships to every browser; full RLS bypass |
| Relax an RLS policy "just to make the panel load" | the panel already works; this opens the data |
| Disable RLS to debug a query | every market-facing table becomes public |
| Skip email confirmation / OTP expiry | anyone can claim any identity |
| Commit `.env.local` or an SMTP/MSG91 secret | leaks forever in git history |
| Turn off public signup to "protect admin" | access is protected by role + RLS, not by who may register |

<!-- END:SMTP-SMS-RUNBOOK -->
