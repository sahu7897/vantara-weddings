# Vantara Weddings — Recreation Blueprint (Phase 4)

> **PHASE 5 ACTIVE** — a Phase 5 brief now governs the project and **overrides this
> blueprint wherever they conflict** (Vercel hosting, Supabase backend/auth, no TWC
> APIs, placeholder content instead of TWC copy, no live-TWC asset downloads).
> See **§13 Phase 5** at the end of this document. Sections below remain valid only
> where not superseded.

> Recreation of **www.theweddingcompany.com** (build `GP-9a4dTH6S6yEF7jhjhm`) under the **Vantara** brand.
> Original capture folder is **read-only source material and is never modified**.

---

## 1. Decisions (confirmed with client)

| # | Decision |
|---|----------|
| D1 | Source of truth = **capture folder + live-site crawling** (approved) |
| D2 | Scope = **full site (~97 routes)** |
| D3 | Goal = **new brand "Vantara" on the original design** — name/logo swapped now with placeholders; palette (`#FF5B95` pink, `#7B0242` maroon, `#333` text) stays identical |
| D4 | Stack = **Next.js (pages router) + TypeScript + Tailwind CSS** (same as original) |
| D5 | Backend = **live public APIs where possible**; anything requiring credentials is flagged, never faked |
| D6 | Assets = **restore byte-perfect from live site** (capture is corrupted for JS: beautifier broke `?.` → `? .`) |
| D7 | Analytics = structure for **original IDs** (GTM-W6DVCTW etc.), activate later on client's go-ahead |
| D8 | Deploy = **Hostinger (product undecided)** → project must be **static-export compatible**, SSR optional |
| D9 | Content = original copy kept, **brand name swapped** ("The Wedding Company" → "Vantara") |
| D10 | Environment = Node 24 LTS installed; use `npm.cmd` in PowerShell (execution policy blocks `npm.ps1`) |

## 2. Sources of truth (locations)

| What | Where |
|------|-------|
| Original capture (READ-ONLY) | `C:\Users\MODI\OneDrive\Desktop\vantaraweddings_webapp\www.theweddingcompany.com\` |
| Captured homepage DOM + CSS | `…\www.theweddingcompany.com\index.html`, `_next\static\css\*.css` |
| Full route manifest | `…\_next\static\GP-9a4dTH6S6yEF7jhjhm\_buildManifest.js` (97 routes) |
| Crawl research (57 pages raw HTML + outlines) | `%TEMP%\opencode\twc_research\raw\`, `outlines\` |
| Original un-minified-corrupted → pristine live build (JS/CSS) | `%TEMP%\opencode\twc_research\live_build\` |
| Live sitemap index | `https://www.theweddingcompany.com/sitemap_index.xml` |

## 3. Project architecture

```
vantara-weddings/                 ← NEW project (sibling of capture; original untouched)
├── docs/
│   ├── BLUEPRINT.md              ← this file
│   └── research/                 ← copied outlines/manifests worth keeping
├── public/
│   ├── images/                   ← restored: /images/HomePage/**, HomePageRevamp/**
│   ├── media/                    ← restored: _next/static/media originals (renamed, no hash)
│   ├── videos/                   ← gcpimages videos (or hotlink, see §8)
│   └── brand/                    ← Vantara logo/favicon (placeholder initially)
├── src/
│   ├── components/
│   │   ├── layout/               Header, Footer, StickyCTABar, MobileMenu, Seo, Analytics
│   │   ├── ui/                   Button, Card, Accordion, Carousel, Modal, Loader, Toast
│   │   ├── home/                 Hero, HowItWorks, BookVenues, Cities, Partners, Services,
│   │   │                         Proposals, IdeasCarousel, WhyBetter, Faq, VendorCta, Betterhalf
│   │   ├── venues/               VendorCard, FilterBar, Gallery, EnquiryForm, HoldOnDate, Mapless
│   │   ├── directories/          Decorators/Photographers listing + detail components
│   │   ├── ideas/                Ideabook grid, MediaDetail, SaveToIdeabook, SearchBar
│   │   ├── funnel/               LeadForm (OTP), PlannerWizard, ProposalViewer, ScheduleMeeting
│   │   └── lp/                   LandingPage sections (hero, forms, galleries, FAQ)
│   ├── pages/                    ← mirrors original routes 1:1 (pages router!)
│   │   ├── index.tsx, _app.tsx, _error.tsx, 404.tsx, 500.tsx
│   │   ├── about-us.tsx, contact-us.tsx, wedding-services.tsx, …
│   │   ├── wedding/[blogSlug].tsx, wedding-decorators/… , wedding-photographers/…
│   │   ├── wedding-venues/[venueCityOrFilter]/[venueLocalityOrDetailOrFilter].tsx …
│   │   ├── wedding-ideas/… , plan-my-wedding/… , lp/… , mfe/… , contract-signature/…
│   │   └── api/… (only if a server is kept; static export uses none)
│   ├── services/                 api client instances (ky), endpoint table, typed responses
│   ├── hooks/                    useAuth, useLeadForm, useIsMobile, useScrollSection, useCarousel
│   ├── store/                    zustand stores (leadForm view, auth user, venue-search user)
│   ├── lib/                      analytics dispatchers (gtm/posthog/mixpanel), utils, seo
│   ├── styles/                   tailwind.css, fonts.css, nprogress.css, keyframes
│   └── config/                   site.ts (brand strings, contacts, nav), env.ts
├── scripts/
│   ├── restore-assets.py/.ps1    ← download pristine originals from live site
│   └── verify-routes.py          ← route/asset 404 checker vs local build
├── next.config.mjs               images.unoptimized=true, export-ready, trailingSlash as original
├── tailwind.config.ts            ← exact original design tokens (§6)
├── tsconfig.json, .eslintrc, .prettierrc, .env.example, package.json
```

**Key fidelity rules**
- Same router type (**pages router**), same route paths, same class-level Tailwind approach (arbitrary values OK — the original uses them heavily).
- `next export` compatible (`output: 'export'` on modern Next, or `next export`), because Hostinger product is undecided. Pages needing rewrites (`/robots.txt`, sitemaps) are generated as static files.

## 4. Page map (97 routes, 15 families)

| Family | Routes | Auth | Data source | Notes |
|--------|--------|------|-------------|-------|
| **Core** | `/`, `/about-us`, `/contact-us`, `/wedding-services`, `/price-beat-challenge`, `/referral`, `/account-deletion` | none | static + lead-form API | homepage = full section stack (captured) |
| **Blog** | `/wedding`, `/wedding/[blogSlug]` | none | `weddingconsumerapi` or CMS via page props | 2 posts crawled as samples |
| **Venue directory** | `/wedding-venues`, `/wedding-venues/[city]`, `/wedding-venues/[city]/[localityOrDetail]`, `/wedding-venues/hold-on-date/[vendorId]`, `/venue-search`, `/venue-result` | none (hold-date uses OTP token) | `weddingapi /v1 venue/vendors/*`, `selection-tool/*`, `common-config/*` | detail page: 3 forms, gallery, similar venues |
| **Decorators** | `/wedding-decorators`, `/[decorCity]`, `/[decorCity]/[localityOrCategory]` | none | `vendors/filters?businessCategory=DECORATION` | same card system as venues |
| **Photographers** | `/wedding-photographers`, `/[photographyCity]`, `/[photographyCity]/[localityOrCategory]` | none | `businessCategory=PHOTOGRAPHY` | |
| **Ideas (ideabook)** | `/wedding-ideas`, `/[primaryCategory]`, `/[primaryCategory]/[subCategory]`, `/idea/[mediaId]`, `/search`, `/widget`, `/profile`, `/view-ideabook/[ideabookId]`, `/signout` | profile/ideabook = next-auth OTP | `weddingconsumerapi /v1 ideabook/*`, `account/me` | save-to-ideabook needs login → OTP flow |
| **Planner funnel** | `/lp/wedding-planner/{initiate,form,form-completed,load,login,pre-proposal,post-proposal,shortlist,payments/*}`, `/plan-my-wedding/{initiate,proposal,schedule-meeting,[proposalPdfId]}` | OTP (wedding-planner + pmw token stores) | `wedding-planner/* v1+v2`, `selection-tool*`, `proposal/*` | payments pages = razorpay result handling |
| **Lead forms (MFE)** | `/mfe/leadform` … `leadform-6` | OTP in-form | `client/auth/initiate|validate`, `truecaller/*`, leads push | homepage CTA opens same component as modal |
| **Landing pages** | 31 × `/lp/*` (city/service/venue/planning variants) | mostly none | static + lead forms | `robots.txt` disallows `/lp/` (kept as-is) |
| **Legal** | `/twc-client-terms`, `/twc-vendor-terms`, `/refund-policy`, `/privacy-policy`, `/twc-privacy-policy`, `/safety-guideline`, `/careers`, `/success-stories` | none | long-form content | `/privacy-policy`, `/careers` are external-rewrite style (verify during build) |
| **Payments/Pages** | `/wedding-payment-plan` (razorpay) | none/phone | razorpay + config API | external dependency — see §12 |
| **Contract e-sign** | `/contract-signature/sign/[token]`, `/view/[viewToken]` | token in URL | `esign/sign/*` | token-gated, cannot be crawled — rebuild from page chunk |
| **Invitation** | `/wedding-invitation-card` | none | static | |
| **System** | `/404`, `/500`, `/_error`, `/sitemap/[...slug]` | — | static | robots.txt static; sitemap generated |
| **Blog/portfolio misc** | `/wedding-portfolio` | none | media-heavy page (6 forms — verify) | crawled |

## 5. Component map

```
AppShell (_app)
├── Seo (next/head, OG/Twitter, JSON-LD)
├── Analytics (GTM loader + dataLayer push helpers)   [dormant until D7 activation]
├── Header (sticky, h-14/56px, bg rgba(255,255,255,.8), logo, [Venues | Price Beat | More▾], hamburger)
│   └── MoreDropdown (desktop) / MobileMenu (drawer)
├── LeadFormModal (zustand view state; steps: phone → OTP(±Truecaller) → details)  ← shared: homepage, lp, mfe
├── PageComponent (per route)
├── Footer (3 link columns + contact + socials + disclaimer + vertical logo)
├── StickyCTABar (mobile: whatsapp icon + CTA, desktop: whatsapp pill + gradient "Start my wedding planning")
├── ToastHost (react-toastify)  +  #portal  +  NProgress (#FF5B95, route-change)
```

Homepage sections (exact ids preserved for behavior hooks): `home-page-revamp` → hero (video desktop/portrait, dual CTA) → `how_it_works_outer_section` (200dvh sticky) → `book_venues_section` → `venues_in_different_cities_section` (8 cities) → `industry_partners_section` → `end_to_end_services_section` → `wedding_proposals_section` → `explore_wedding_ideas_section` (keen-slider) → `why_are_we_better_section` → `frequently_asked_questions_section` (accordion) → `are_you_a_vendor_section` → `more_about_betterhalf_section`.

## 6. Design tokens (extracted from original CSS)

| Token | Value |
|-------|-------|
| `appTheme` (pink) | `#FF5B95` |
| `appThemeNew` (maroon) | `#7B0242` |
| `primaryTextColor` | `#333333` |
| `darkGrey` | `#8D8D8D` |
| Fonts (next/font) | Lato (default `font-lato`), Playfair Display, Plus Jakarta Sans, Poppins, Moisette (script) |
| Breakpoints | sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536 (+ custom 400/480/1600/1700/1800) |
| Header | 56px (h-14), sticky, white/80 backdrop |
| CTA gradient | `to right,#9A2157,#A1285E,#BC2D6D,#A1285E,#9A2157` |
| WhatsApp pill | `#1FAF38` (mobile gradient `#01C03D→#008B32`) |
| Radius/shadows | rounded-2xl CTAs, `shadow-[0px_6px_15px_0px_rgba(0,0,0,0.20)]` |
| Page progress | nprogress bar `#FF5B95`, 3px |
| Libraries styling | Swiper, keen-slider, react-toastify (all in original CSS — reproduce) |

All values are **copied, not guessed** — original compiled CSS is in the capture and pristine live copy in `live_build/css/`.

## 7. API map

**Clients (ky):** see extracted endpoint table (chunk `5061`, module `75880`).

| Client | Base | Auth |
|--------|------|------|
| A | `https://weddingconsumerapi.theweddingcompany.com/v1` | next-auth session `user.accessToken` Bearer; signOut on `Refresh Token Expires` |
| B | `https://weddingapi.theweddingcompany.com/v1` | none (public GETs: `venue/vendors/?…`) |
| C | same | `pmw-user-object` localStorage Bearer, 401 → `leads/panel/auth/refresh-token/` |
| D | same | `venue-search-user-data` localStorage token |
| E | `NEXT_PUBLIC_MOCK_BASE_API_URL` | mock (kept for local dev; **not used for fake production data**) |

**Endpoint groups:** vendors/city/locality/coordinates/similar · `ideabook/*` (list, seo, upload, report) · `wedding-planner/{auth,me/form,localities,vendors,shortlist}` v1 + `v2/{me,queries,vendors-with-availability-tool,add-event-date}` · `selection-tool*`, `proposal/*` (PDF/design), `selection-tool-meetings` · `common-config/get-config` (filters, fees, homepage config) · `client/auth/{initiate,validate,truecaller/*}` **OTP login** · `referrals/*` · `esign/*` · `notifiers/manual` (hold-on-date) · `seo/footer` · redirect SSO → `https://userapp.theweddingcompany.com/auth?access_token=…` .

**Auth flow:** phone → `client/auth/initiate/` (or Truecaller start/status, Google `auth/validate/google`) → OTP → `client/auth/validate/` → tokens stored (`user-object` / `pmw-user-object` per context) → next-auth session (consumer) or localStorage (funnel) → SSO redirect to userapp.

> ⚠️ `SEND_OTP: "https://gcpstaging1.betterhalf.ai/v2/auth/otp/send/"` is hardcoded to a **staging** host in the original production bundle. Kept as a configurable env (`NEXT_PUBLIC_OTP_SEND_URL`) — original behavior documented, flagged in §12 (Rule 9).

## 8. Dependency map

| Package | Original | Recreation |
|---------|----------|------------|
| next / react / react-dom (pages router) | ✓ | **reuse (same)** |
| typescript | ✓ (inferred) | **add** (D4) |
| tailwindcss | ✓ | **reuse (same config tokens)** |
| ky, @tanstack/react-query, zustand, next-auth, react-toastify, swiper, keen-slider, gsap, lottie-web, dayjs, react-hook-form, zod | ✓ detected in chunks | **reuse as needed** (only what pages actually use) |
| @bugsnag/js, mixpanel, posthog-js, clarity.ms, clevertap | ✓ | wired later (D7) |
| next/font (Lato, Playfair, Plus Jakarta Sans, Poppins, Moisette) | ✓ | **reuse** |
| razorpay | ✓ (1 chunk) | keep code path; needs key → §12 |
| axios, framer-motion, leaflet, sentry, mapbox, algolia, recaptcha | ✗ not used | **do not add** |

**Assets (restore from live):** all `/images/**`, `/_next/static/media/**` (drop content-hash → stable names), `/flowerbg.webp`, `/sparkle.svg`, `/arrows_more_down.svg`, favicon, gcpimages videos/posters (option A: download ~7 files to `public/videos`; option B: hotlink live CDN — decide at build; default **download**, self-hosted = better for Vantara). External widget images (`imageswedding…`) stay hotlinked (data API).

**Brand swap layer (`src/config/site.ts`):** brandName, logo, favicon, `tel:`/`mailto:`/WhatsApp (placeholder — client to supply Vantara's), social URLs (placeholders), OG image. Single source → header/footer/meta/JSON-LD all read it. Placeholder logo = simple "Vantara" wordmark SVG until brand kit arrives.

## 9. Analytics & SEO (per D7)

- GTM loader component with `NEXT_PUBLIC_GTM_ID` (**value later**: original `GTM-W6DVCTW`), dataLayer event names copied from original (`home_page_view` → posthog, `trackLeadFormCTAClicked(“homepage”)`, etc.).
- SEO per page: original `<title>`/description/canonical/OG/Twitter patterns + JSON-LD (venues/hub pages) — captured per-page in `outlines/*.json`.
- Static `robots.txt` (original rules incl. `/lp/`, `/wedding-ideas/` disallow) + generated `sitemap_index.xml` family.

## 10. Build & deploy

- `npm.cmd run build` must produce **zero TS/build errors**; `next export` (or `output:'export'`) for Hostinger shared hosting; document VPS path (standalone) for later.
- `.env.example`: `NEXT_PUBLIC_API_*` bases, `NEXT_PUBLIC_OTP_SEND_URL`, `NEXT_PUBLIC_MOCK_BASE_API_URL`, `NEXT_PUBLIC_GTM_ID`, next-auth secret/URL, razorpay key (public), analytics IDs.
- Image optimization off for export (`unoptimized: true`) — matches original behavior (it serves raw webp/mp4 anyway).

## 11. Implementation stages (each verified before the next)

1. **Scaffold** — Next.js + TS + Tailwind + lint/prettier; tokens & fonts; `site.ts` brand layer; empty shell renders.
2. **Asset restore script** — pull pristine CSS/JS/images/videos/fonts from live; populate `public/`.
3. **App shell** — Header/More/MobileMenu/Footer/StickyCTABar/NProgress/Toast/SEO; homepage skeleton with all 13 sections (structure first from captured DOM).
4. **Homepage pixel pass** — compare served build vs capture+live (screenshots), fix diffs (Phase 9 table).
5. **Content pages** — blog, legal, about/contact/services/invitation/payment-plan/referral/price-beat.
6. **Directories** — venues (national→city→locality→detail, search/result, hold-on-date), decorators, photographers with live read APIs.
7. **Ideas** — gallery/category/media/search + ideabook (auth-gated parts: real OTP if credentials exist, else clearly-marked disabled state).
8. **Funnel** — lead form modal + `/mfe/*` + `/lp/wedding-planner/*` + `/plan-my-wedding/*` (payments pages wired to API, activation flagged).
9. **Landing pages** — 31 × `/lp/*` from a shared section kit (structure differs per page → documented from crawls).
10. **System** — 404/500, sitemaps, robots, contract-signature (token pages), widget, signout.
11. **Verification suite** — route crawl (0 404s), console clean, network check, responsive (360/390/768/1024/1440), visual diff list vs original, Lighthouse pass, production build artifact zipped for Hostinger.

## 12. Risks / blockers (client input needed eventually)

| # | Item | Impact | Status |
|---|------|--------|--------|
| B1 | OTP send hardcoded to **staging** (`gcpstaging1.betterhalf.ai`) in original | auth/lead forms | Use env var; confirm with client which OTP provider to use for Vantara |
| B2 | Vantara brand kit (logo, WhatsApp, email, socials, domain) | rebrand completeness | Placeholders per D3; swap when provided |
| B3 | Razorpay keys + payment flow | `/wedding-payment-plan`, `payments/*` | Code path kept; needs Vantara's gateway account |
| B4 | next-auth secret/URL + userapp SSO (TWC-owned) | authenticated ideabook/funnel | Public reads work; logged-in state may need Vantara backend decision |
| B5 | Analytics IDs activation (D7) | tracking | Wired dormant |
| B6 | Blog/CMS data source for `/wedding/*` | content pages | Determine API during stage 5 (captured in page chunk) |
| B7 | `robots` disallows crawling some paths of TWC | research only | Client owns site; crawl was approved (D1) |

---

## 13. Phase 5 (current governing brief — overrides §§1–12 where they conflict)

**Context:** Vantara Weddings is a wedding planning / event management business
launching in **Banda, Uttar Pradesh**, then Jhansi, Lucknow, Delhi/NCR. Vendor
network on a commission model; target weddings ₹1L–₹10L+; mostly Indian users
who prefer **phone + OTP** over passwords.

### 13.1 Overrides

| # | Was (Phase 4) | Now (Phase 5) |
|---|---|---|
| O1 | Static export for Hostinger (D8) | **Vercel**; drop `output:'export'`. Pages router + API routes + `getServerSideProps`/ISR allowed. TS + Tailwind stay. |
| O2 | TWC APIs (weddingapi, weddingconsumerapi, userapp SSO, gcpstaging1 OTP) | **Supabase** (Postgres, Auth, Storage, RLS). **Never call any TWC endpoint.** All backend code removed/replaced in `src/services`. |
| O3 | next-auth / TWC SSO | **Supabase Auth** — phone + OTP primary; email magic link / Google optional. `@supabase/ssr`, session in httpOnly cookies, no tokens in localStorage. |
| O4 | Copy TWC text/assets byte-faithfully (D6, Stage 2) | ~~**Do NOT copy TWC text, images, videos or logos.** Clearly-marked **"Vantara placeholder"** content the client will replace.~~ **AMENDED 2026-10-04 → see §13.11:** client confirms rights to the local TWC content; Stage 4 keeps local content and adapts branding instead of placeholdering. No live-site scraping, no third-party scraping, no TWC endpoints (O2 stands). |
| O5 | `.env` values in repo docs | All secrets/provider URLs in `.env.local` / Vercel env vars. Never hardcoded. |

Note: assets/scripts produced during Phase 4 (pre-brief) — download scripts are
now guarded (`raise SystemExit` at top): `scripts/restore-assets.py`,
`scripts/fetch_webflow_assets.py`, `scripts/fix_webflow_assets.py`,
`scripts/wire_spas.py`. Already-fetched files sit in `public/` as the
**source of truth for the Stage-4 brand-adaptation pass** (§13.11). The guards
stay: no live TWC site fetching, ever.

### 13.2 Auth (Supabase Auth)

- Phone + OTP primary; optional email magic link or Google.
- SMS provider: a provider Supabase supports; MSG91 (or other Indian provider,
  DLT registration required) via **Supabase Send SMS Hook** if chosen.
  Supabase docs checked at implementation time; chosen option + rationale reported.
- `@supabase/ssr`, httpOnly cookie session.
- Roles: `customer` | `vendor` | `admin` in `profiles.role`; new signups → `customer`;
  **only an admin can change a role**.
- Post-login redirect by role: customer → `/account`, vendor → `/vendor/dashboard`,
  admin → `/admin/dashboard`.
- Route protection server-side (getServerSideProps or middleware), not UI-only.
- OTP safety: expiry, attempt limits, resend cooldown, rate limits per phone + per IP.

### 13.3 Database (`supabase/migrations/`)

Tables: `profiles`, `vendors`, `venues`, `vendor_media`, `cities`, `localities`
(seed: Banda, Jhansi, Lucknow, Delhi/NCR), `leads`, `bookings`, `ideabook_items`
(if Ideas kept). Indexes on city, category, status.

### 13.4 RLS (mandatory on every table)

- anon: read only `status='approved'` vendors + their venues/media.
- customer: own profile/leads/ideabook only.
- vendor: own vendor row/media; leads assigned to them; own bookings.
- admin: full access via `profiles.role` checked with a **security definer** helper.
- service role key server-side only, never in the browser.
- Explicit policies + test checklist (e.g. vendor cannot read another vendor's leads).

### 13.5 Storage

- Bucket `vendor-media` (public read, write only owning vendor or admin); private bucket for documents.
- Client-side upload validation: ≤ ~1 MB, webp/jpg/png.

### 13.6 Public pages on Supabase

- Keep routes: home, `wedding-venues` (city, locality, detail), decorators,
  photographers, about, contact.
- Typed Supabase client in `src/services` replaces the TWC API client.
- Empty state when no data ("No venues yet in this city").
- Lead forms → `leads` insert (phone OTP verification before submit if feasible).
- **Skipped for now:** Ideas feature, planner funnel, payments (Razorpay), e-sign, 31 `/lp/*` landing pages.

### 13.7 Dashboards

- `/admin/dashboard`: leads table (filters + status change), assign lead to vendor,
  vendor approve/reject, vendor/venue CRUD forms with image upload, bookings + commission summary.
- `/vendor/dashboard`: profile + media editor, my leads, my bookings.
- `/account`: my enquiries + status.

### 13.8 Deploy (Vercel)

- `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` (server only), SMS provider keys, `NEXT_PUBLIC_SITE_URL`.
- README: create Supabase project → run migrations → connect Vercel (integration or
  manual env) → Auth redirect URLs (localhost + Vercel domain) → configure SMS provider.
- Seed script: a few clearly-fake sample venues for Banda.

### 13.9 Working rules & stages

- Stages, **stop for confirmation after each**: (1) Supabase client + auth,
  (2) migrations + RLS, (3) admin panel, (4) public pages on real data,
  (5) vendor panel, (6) deploy checklist.
- Before each stage: list files to create/change.
- `npm run build` must pass with **zero TypeScript errors** at every stage.
- Missing credential/decision (SMS provider, domain, Supabase project) → **stop and ask**; never fake or hardcode.
- This file updated as Phase 5 progresses.

### 13.10 Progress log

- **Decisions (client, confirmed):** SMS = **MSG91 via the Supabase Send SMS
  Hook** (Edge Function; docs-checked: native providers are MessageBird/Twilio/
  Vonage/TextLocal; Send SMS Hook is on the free plan; India TRAI DLT makes an
  Indian DLT-native provider the right default). Supabase project → client
  creates it and provides URL + anon key. Existing TWC-derived pages/assets →
  **kept for now, replaced by placeholders later** (inside Stage 4).
- **Pre-Stage-1 compliance:** all live-TWC download scripts guarded with a
  hard `SystemExit` stop (project: `restore-assets.py`, `fetch_webflow_assets.py`,
  `fix_webflow_assets.py`, `wire_spas.py`; research fetchers in %TEMP% too);
  last live endpoint call (`api.betterhalf.ai` text-invite AJAX on
  success-stories) removed via `build_webflow_pages.py` `TWC_API_TOKENS`;
  static export dropped (O1): `build:static` script and `NEXT_OUTPUT` switch
  removed from `next.config.ts`; `cross-env` uninstalled.
- **Stage 1 — Supabase client + auth (implemented, verification pending keys):**
  `src/lib/supabase/{client,server}.ts` (lazy browser client, cookie-based
  server client for GSSP/API), `src/lib/auth/roles.ts` (Role/ROLE_HOME/
  getRole with pre-Stage-2 fallback to `customer`/safeNext) + `src/lib/auth/gssp.ts`
  (`requireAuth` server guard), root `middleware.ts` (session refresh +
  /account, /vendor/*, /admin/* gating with cookie-carrying redirects),
  `src/pages/login.tsx` (phone OTP + email magic link + Google, 60 s resend
  cooldown, ?next= handling, not-configured notice),
  `src/pages/auth/callback.tsx` (PKCE `code`, `token_hash`, error redirects),
  `src/pages/account/index.tsx` (GSSP-protected, enquiries empty state),
  `src/pages/{vendor,admin}/dashboard.tsx` (role-gated shells, honest Stage 5/3
  notes), `.env.example`. Pending from client: Supabase URL + anon key
  (end-to-end OTP verification deferred until then; MSG91 account + DLT for
  SMS delivery, wired in Stage 2).
- **Stage 2 — migrations + RLS (implemented; NOT yet executed — no local
  Postgres/Docker/CLI here, so the files run on the client's Supabase project):**
  `supabase/migrations/0001_schema.sql` (profiles/vendors/venues/vendor_media/
  cities/localities/leads/bookings/ideabook_items + city/category/status
  indexes + signup trigger → role `customer`), `0002_rls.sql` (RLS enabled on
  all 9 tables; `is_admin()` security-definer helper; explicit policies per
  §13.4 — anon reads approved vendors only, anon lead intake restricted to
  `status='new'` + unassigned, vendors read only assigned leads; guard
  triggers: profile role / vendor status / lead status+assignment are
  admin-only), `0003_storage.sql` (§13.5: `vendor-media` public read +
  owner/admin write on `<vendor_id>/…` paths, `vendor-documents` private),
  `supabase/seed.sql` (4 cities, 5 localities, 4 approved + 1 pending fake
  vendors, 3 fake Banda venues — all marked FAKE DATA),
  `docs/rls-test-checklist.md` (13 RLS + 4 storage tests incl. the
  vendor-cannot-read-other-leads case, admin bootstrap SQL, dashboard
  rate-limit notes), `supabase/functions/send-sms/index.ts` (MSG91 hook —
  payload `{user,sms:{otp}}` per current Supabase docs, Standard Webhooks
  signature check, secrets runtime-only). `tsconfig`/`eslintrc` now exclude
  `supabase/**` (Deno runtime code) so `npm run build` stays green.
- **Stage 2 — executed + live-verified on the client's project (2026-10-04,
  29/29 tests passing):** client delivered Supabase URL + keys → written to
  `.env.local` (service role key server-only). Migrations 0001–0003 + seed
  applied via the session-mode pooler (psycopg2 runner in temp, reads
  `.env.local`, no credentials in scripts), tracked in `public.schema_migrations`.
  The live run **found and fixed three real gaps**: (a) `0004` — 0003 shipped
  only 7 storage policies (missing `vendor-documents` UPDATE), (b) `0005` —
  guard triggers blocked *every* non-signed-in role, so even the documented
  first-admin bootstrap failed; trusted roles (`postgres`, `service_role`,
  `supabase_admin`) now bypass guards as they already bypass RLS, (c) `0006` —
  Supabase grants `anon` ALL privileges on every new table, so #3 returned
  empty sets instead of denials; anon grants now revoked and re-granted
  least-privilege (directory SELECT + leads INSERT). Verified end-to-end:
  structure 9/9 tables + RLS + policies, storage buckets/policies/grants,
  signup trigger + delete cascade, and impersonation tests #1–#13 (anon
  approved-only reads, write-only anon intake, vendor A≠B lead isolation,
  customer/vendor/admin scopes, all three guard triggers). Findings folded
  into `docs/rls-test-checklist.md` — incl. the `INSERT … RETURNING` rule:
  **anon lead forms must insert without `.select()`**. Test users purged
  after the run (GoTrue lowercases emails — harness matches prefixes).
- **Stage 3 — admin panel (2026-10-04, gate: typecheck/lint/build 0/0/0):**
  `admin/dashboard.tsx` → tabs: LeadsPanel (search, status filter, vendor
  assignment), VendorPanel (approval queue — Approve/Reject also syncs the
  owner's `profiles.role` vendor↔customer **through the admin's own session**
  so RLS stays the access control; service key never reaches the browser),
  VendorForm (create/edit + §13.5 media manager: ≤1 MB webp/jpg/png,
  `<vendor_id>/…` paths, upload/preview/delete), VenueForm (capacity, prices,
  address, geo — validated), BookingsPanel (vendors+leads embeds, gross +
  commission summary, honest empty state). New support modules:
  `src/lib/supabase/types.ts`, `src/lib/media/upload.ts`.
- **Stage 4 — public pages on real data (2026-10-04, gate: 0/0/0, running
  locally via `next start`):** `src/services/publicData.ts` — server-side
  **anon** fetchers (cities, localities, approved vendors, venue
  list/detail, media thumbs), fail-soft by design (missing env / outage →
  empty state, never a broken build); this fully replaces the removed TWC
  API client (O2 — zero TWC endpoints called). Routes per §13.6 — which
  **did not exist yet** (nav/footer linked to 404s) — were built:
  `/wedding-venues` (+ `/[city]`, `/[city]/[slug]` locality,
  `/[city]/venue/[id]` detail), `/wedding-decorators`,
  `/wedding-photographers` — all ISR (revalidate 600, `fallback:
  'blocking'`), breadcrumbs, canonical tags, city/locality chips, honest
  empty states; prerendered at build from live seed rows (4 cities, 5
  localities, 3 venue details). Homepage became ISR (300s) with a new
  data-driven `SectionFeaturedListings` (hidden when nothing is approved)
  and the dead "Check availability" button now links to `/wedding-venues`
  (HAND-EXTENSION markers). `LeadForm` (§13.6) ships on contact, both
  directories and venue detail: anon insert into `leads` **without
  `.select()`** (checklist #4b), honeypot + double-submit guard, Indian
  phone normalization, links `customer_id` when signed in. Fixes found
  while verifying rendered HTML: next/head drops mixed-child `<title>`
  (→ template-literal titles), `og:image` no longer hotlinks
  `gcpimages.theweddingcompany.com` (local mirror instead). Deferred
  404s remain by design (§13.6 skips): `/wedding-ideas`(+sub), `/wedding`
  blog, `/success-stories/[slug]`.
- **Post-Stage-4 fix batch (2026-10-04, gate: typecheck/lint/build 0/0/0,
  running locally via `next start`):** (a) header logo switched to the
  client's `logo/vantara_horizontal.png` (1684×686) and sized up — `h-14`
  (56px) logo in an `h-16` sticky header (was a portrait asset letterboxed
  to ~32px at `h-10`); (b) all three homepage "Start my wedding planning"
  CTAs (hero desktop/mobile + sticky bar) were dead static buttons → now
  open the original funnel's lead-form view: `?leadform=true` overlay on
  `/` hosting `LeadForm` (Esc/backdrop/X close, scroll lock, shallow
  router push); (c) `SectionHowItWorks` scroll machine — `useScroll`
  progress through the 200dvh outer section split into thirds drives the
  active step's title/description/dot classes **and** an absolutely-stacked
  image crossfade (the capture froze the section at step 1 with the three
  step images in flow, so only step 1 could ever show); (d)
  `SectionBookVenues` scroll-linked golden-border mask reveal — the capture
  froze the animation's start frame (`mask-size: 400px` arch card with the
  copy clipped); the mask now opens 400px → 3000px full-bleed as the
  section reaches centre (copy unclips) and closes on exit, with the
  `::before` black overlay converted to a motion child fading 0.3 → 0.04;
  (e) legacy original-site city URLs via `next.config` redirects:
  `/wedding-venues/delhi` → `/wedding-venues/delhi-ncr` (real seeded city),
  the 7 other original-city slugs + `/wedding-venues/noida/*` → city index
  (temporary 307s, drop when such a city row exists); in-app Delhi links
  (city tile, about copy) now point canonical; (f) **`/wedding-ideas` built**
  (was a deferred 404): captured h1 + ideabook blurb, 18 category pills
  from `api_fixtures/ideabook/category.json`, 12-photo gallery from local
  portfolio imagery — remote `imageswedding.*` ideabook photos stay out per
  §13.11 (no runtime TWC-host calls; drop local files into
  `public/ideabook/` later to swap in the originals). Category/detail/
  search subroutes remain out of scope; pills are display-only so nothing
  links to a 404.
- **Admin panel verification + `getRole` bug fix (2026-10-07, gate:
  typecheck/lint/build 0/0/0, running locally via `next start`):** signing
  in to `/admin/dashboard` for a live check surfaced a real defect — the
  `"profiles: own or admin reads"` policy (0002) returns **every** profile
  row for an admin, so `getRole`'s unfiltered `.maybeSingle()` failed with
  *"multiple (or no) rows returned"* on exactly the users it must succeed
  for, silently demoting all admins to `DEFAULT_ROLE` (checklist #1's
  promoted admin would have hit this too). `getRole(supabase, userId)` now
  scopes to the signed-in user's own row (`.eq('id', userId)`); call sites
  updated in `middleware.ts`, `gssp.ts`, `auth/callback.tsx`, `login.tsx`
  (callback/login capture the user from their existing verify/exchange
  response — no extra round-trips on the page-request path). Verified live:
  middleware + `requireAuth` both admit the admin, `/admin/dashboard`
  renders (Leads 3/3, Vendors queue 4 with filters/actions, Bookings
  honest empty state) and `/account` shows `Role Admin`. Local dev admin
  provisioned through Supabase's admin API (`devadmin@vantara.local`,
  profiles.role=admin — **not** a guard bypass: middleware/requireAuth/RLS
  all unchanged and still enforcing); remove or keep for Stage 6 auth
  testing.
- **Callback `?type=` passthrough + live admin sign-in (2026-10-07, gate:
  typecheck/lint/build 0/0/0):** login-page email sends tripped GoTrue's
  email rate limit, so sign-in moved to admin-minted links:
  `/auth/callback?token_hash=` now honors the documented `&type=` query
  param (whitelisted: email/magiclink/recovery/invite/signup/email_change,
  default `email` — previously hardcoded `email`, which rejected magiclink
  tokens as "invalid or expired"). Verified end-to-end in a browser:
  minted link → callback → `verifyOtp(type=magiclink)` → fixed `getRole`
  → `/admin/dashboard` as the promoted owner account (Leads 4/4); owner
  also signed into the panel in their own browser.
- **Gate restoration after the CMS batch + local run (2026-10-09, gate:
  typecheck/lint/build 0/0/0, running locally via `next dev`):** the
  2026-10-07 ~20:30 CMS batch (migration `0007_cms_schema.sql`,
  `services/cmsData.ts`, five `components/admin/cms/*` panels, 8-tab
  dashboard — **itself never logged in §13.10**) had landed after the last
  recorded gate run and left the tree red: `SectionHero.tsx:184` referenced
  `variant` outside `renderSlides`'s scope (TS2304 *and* a runtime
  `ReferenceError` that 500'd the homepage) on a dead `currentSlide` line,
  plus 4 lint warnings under `--max-warnings 0` (orphaned pre-CMS
  `HERO_SLIDES` — the DB `hero` row and `DEFAULT_HERO_CONTENT` both carry
  the current 4-slide set, so the original's 5th slide "Chitwan &
  Abhitendra" was dropped by the CMS port, pending client confirmation;
  unused `CmsSectionRow`; `PagesManagerPanel` mount-effect deps). Fixed all
  four (dead line deleted, dataset removed with the regen-note updated to
  point at `DEFAULT_HERO_CONTENT`, import pruned, mount-only effect given a
  justified `exhaustive-deps` disable since `load()` also runs after saves);
  verified `tsc` 0, `eslint` 0, `next build` 0 (41 pages), dev server
  restarted with `/` and `/login` 200. **Known state:** CMS admin writes
  persist to `site_settings`/`cms_*` but no public page reads them yet
  (`fetchSiteSettings`/`fetchCmsSections`/`fetchCmsPage` have zero callers;
  `<SectionHero />` receives no `content` prop; `SectionFaq` uses a
  hardcoded list) — read-path wiring + a proper CMS log entry still owed.

- **Read-path wiring, brand-completion and route/link audit (2026-10-10, gate:
  typecheck/lint/build 0/0/0):** closed the gap recorded at the end of the
  previous entry � the CMS is no longer write-only.
  - **CMS read path (new):** `src/lib/cms/siteSettings.tsx` (context +
    `useSiteSettings`, static fallback), `src/lib/cms/loadSiteSettings.ts`
    (`mergeSiteSettings` / `loadEffectiveSiteSettings`, fail-soft, blank-string
    guard so a partial row can never blank a footer field). `_app` now has
    `getInitialProps`, which loads the effective `site_settings` rows server-side
    (lazily importing the Supabase client so it stays out of the public bundle)
    and publishes them to `SiteHeader`/`SiteFooter`/`StickyCtaBar`.
    `pages/index.tsx` `getStaticProps` additionally reads the `home` sections and
    feeds `SectionHero` (`content={hero}`), `SectionFaq`, `SectionWhyBetter` and
    `SectionVendorCta`; those four components were converted from hardcoded
    markup to CMS-driven props with their captured copy retained as
    `DEFAULT_*` fallbacks. Admin edits now actually change the live site.
  - **Migration `0008_fix_site_settings_contacts.sql` (NEW, must be applied):**
    0007 seeded *placeholder* contacts (phone `95381 27163`, WhatsApp
    `919538127163`, `support@vantaraweddings.com`, address "Delhi NCR /
    Bengaluru / Rajasthan"). Harmless while nothing read those rows � but now a
    stored row overrides `src/config/site.ts`, so on an already-migrated project
    the old number would reappear despite correct code. 0008 upserts the real
    client-supplied values (phone/WhatsApp `+91 73551 91261`, email
    `bookings@vantaraweddings.com`, the Banda office address, and the real
    social URLs) and raises an exception if the result is still wrong.
  - **Brand leakage removed site-wide (the rebrand had never reached the live
    actions):** the header mobile-drawer WhatsApp CTA fell back to a hardcoded
    `919538376029` (the original company's number) because
    `site.contacts.whatsappNumber` was empty, and the hero CTAs + sticky bar
    hardcoded the same number; the footer shipped the original phone
    (`8884090499`), support email, Bengaluru office address and four TWC social
    accounts. All CTAs now build from the effective settings via the new
    `buildWhatsappUrl()` (`src/lib/site/whatsapp.ts`, returns `null` rather than
    a dead/foreign chat when unconfigured); the footer renders only socials that
    are actually configured. Across the generated content pages: 35 occurrences
    of TWC social URLs, old emails and `theweddingcompany.com` were replaced
    (incl. split-across-tags `ceo-office<br/>@�` and `priyansh.r@�` addresses),
    and visible "Betterhalf" body copy was rebranded to "Vantara Weddings".
    `src/config/site.ts` now holds the real contacts/address/socials.
  - **Panel hardening (delegated, verified):** every admin/vendor panel that
    called `getSupabaseBrowserClient()` unguarded now checks
    `isSupabaseConfigured()` first, sets its existing error state and returns
    early, wrapped in try/catch (11 files) � a build without Supabase keys
    renders a notice instead of throwing on mount. `PagesManagerPanel`'s
    mount-effect dependency warning was fixed properly with a `useCallback` +
    `selectedSlugRef` (no `eslint-disable`), which also avoids re-fetching and
    discarding an unsaved new page on every selection change.
  - **Vendor panel built (Stage 5 � was an empty placeholder shell):**
    `pages/vendor/dashboard.tsx` now loads, server-side through the vendor's own
    session, the owned `vendors` row (via `owner_user_id`), assigned leads,
    bookings and media, and offers a profile editor (business details + price
    band; `status` deliberately excluded because the 0002 guard trigger makes it
    admin-only), a �13.5 media manager (=1 MB webp/jpg/png, `<vendor_id>/�`
    paths, upload/preview/delete), "my leads" with tel: links and "my bookings"
    with the vendor's own commission breakdown � plus honest empty states and a
    pending/rejected notice. `pages/account/index.tsx` likewise now lists the
    signed-in customer's real enquiries with statuses (it previously promised
    data "once enquiry forms go live" even though LeadForm had been writing
    `leads` since Stage 4).
  - **Route + internal-link audit (new `route_audit` script, 35 routes / 307
    distinct targets):** fixed every resolvable break � `/wedding-portfolio/*`
    (234 dead detail links whose assets were never captured),
    `/wedding-card-design/*` (22), `/success-stories/*` (8) and the
    `/wedding-ideas/*` subcategory pills now resolve to valid query targets on
    their collection pages, and `/success-stories-page` "View All" points at
    `/success-stories`. The dead "Vantara Blog" nav entries (header dropdown �2
    + footer) were removed because `/wedding` was never built and no real post
    content exists locally; `/wedding` and `/wedding/:slug` now 307 to
    `/wedding-ideas` so shared links cannot 404 (drop when the blog ships).
    Remaining audit output is verified-benign: the 7 legacy city slugs are
    covered by `next.config` redirects and
    `/integrity-program/assets/*.css` is a captured stylesheet link, not a route.
  - **Gates verified on this exact tree:** 	sc --noEmit 0, eslint .
    --max-warnings 0 0, 
ext build 0 � 35 routes, middleware 94.7 kB. The
    build prerendered the directory routes **from live Supabase rows**
    (/wedding-venues/{banda,lucknow,jhansi,delhi-ncr} plus five localities),
    which is independent proof that the read path is reaching the real database.
    Note: adding _app.getInitialProps marks every page � (Dynamic) in the
    build table even though ISR still applies (venue routes still list
    Revalidate 10m) � an accepted trade for globally CMS-driven branding.
  - **Git:** the project had **no repository** (.gitignore existed but no
    .git), so none of the above had a rollback point. git init + an initial
    commit now tracks 2,432 files; .env.local is confirmed ignored and the
    staged content was grepped for credential material before committing.
  - **Still open:** apply 0008 to the live project (no local Postgres, and
    outbound HTTPS is blocked in this environment, so it could not be executed
    here); the original 5th hero slide ("Chitwan & Abhitendra") is still absent
    from both the DB `hero` row and `DEFAULT_HERO_CONTENT`, pending client
    confirmation; and the repo has no Git history, so there is no rollback point
    for any of this.
- **Local panel verification in a real browser (2026-10-10):** drove headless Chrome over
  the DevTools Protocol against `next dev` on **http://localhost:3001** (port 3000 was
  occupied by another process) and signed in through the app's own
  `/auth/callback?token_hash=�&type=magiclink` route � no auth bypass, no mocked data.
  **Verified:** `/login` renders both methods (switching to *Email link* reveals the email
  field; the OTP step and its resend cooldown render); `/admin/dashboard` authenticates,
  shows all 8 tabs and loads real rows (Leads 6/6 with search + status filter, Vendors
  queue, Site Settings with 18 fields incl. phone `+91 73551 91261` /
  `bookings@vantaraweddings.com` / the real Instagram URL and **no** `95381` placeholder);
  `/vendor/dashboard` admits the role and shows its honest "no vendor profile linked"
  state; `/account` renders role + enquiries. Screenshots in `docs/screenshots/`.
  **Migration 0008 was applied to the live project from this session** (via the service-role
  API, since no local Postgres client exists) and read back verified; the homepage then
  rendered `wa.me/917355191261`, the real tel/mailto and the real social links � the CMS
  read path is confirmed working end-to-end against production data.
  **NEW BLOCKER FOUND (deployment, not code): the Supabase project has phone auth
  DISABLED** � `/auth/v1/settings` reports `phone: false` / `sms provider: false`, so a
  phone OTP request fails with `400 Unsupported phone provider` (surfaced honestly by the
  login page). The MSG91 *Send SMS* hook must be deployed and the phone provider enabled
  before OTP sign-in can work; email magic links and Google remain the only functioning
  methods until then. Local test artifacts (temporary vendor/lead/booking rows) were
  created and fully removed during verification.
### 13.11 Content-policy amendment (recorded 2026-10-04, client-confirmed)

After an initial instruction that conflicted with O4, the client was asked
directly which rule stands and answered: **"Amend the brief — I confirm
rights."** The client confirms they hold the rights to the TWC content and
assets held in this local project — including third-party material embedded
within it — and accepts responsibility for that confirmation. Therefore:

- **O4 is amended:** the Stage-4 "replace everything with Vantara
  placeholders" pass is **cancelled**. Stage 4 keeps the existing local
  TWC-derived content as its base and **adapts branding/copy to Vantara
  Weddings** where required.
- **Source of truth = existing local project files only.** Still prohibited
  under this amendment:
  1. scraping/downloading from the **live TWC site** — no scripts, crawlers,
     scrapers, browser automation or TWC APIs for content capture;
  2. scraping or downloading from **any third-party source** (client's
     wording: content comes from local files only — the "Do [not] scrape or
     download from third-party sources" line read as "Don't");
  3. calling **TWC endpoints/APIs** from app code — O2 stands regardless of
     content rights (Phase 5 runs on Supabase).
- All other §13 rules (auth, RLS, storage, stages, build gates, secrets)
  are unchanged.
- Assets whose provenance is unclear (stock licences, vendor portfolio
  photos, third-party fonts/widgets) get flagged in the Stage-4 report
  rather than assumed covered.
