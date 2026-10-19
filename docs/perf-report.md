# Performance investigation & fixes

Measured with **CDP network instrumentation** (headless Chrome, cold cache, real
transferred bytes) against a **production build** (`next build && next start`).
Raw captures: `docs/screenshots/perf-*.json`.

---

## Headline result

| Metric | Before | After | |
|---|---|---|---|
| `/wedding-services` page JS | 1.84 MB | **7.75 kB** | −99.6% |
| `/wedding-services` first load | 2.01 MB | **179 kB** | −91% |
| `/` page JS | 399 kB | **60.3 kB** | −85% |
| Homepage HTML (document) | 661 KB | **207 KB** | −69% |
| Homepage total weight (prod) | 2.50 MB | **2.35 MB** | −6% |
| Homepage images | 1.09 MB | **0.95 MB** | −13% |
| Logo (header/footer) | 159.6 KB PNG | **12.2 KB WebP** | −92% |
| TTFB (prod, local) | — | **8 ms** | |
| DOMContentLoaded | — | **71 ms** | |
| Load event | — | **278 ms** | |

> The homepage total is dominated by **third-party widgets** (see bottleneck #4), so
> the first-party improvements above understate the real gain for repeat visitors.

---

## The five root causes

### 1. 2.08 MB of base64 images inlined in the JSX  → **FIXED**

Four components embedded raw `data:image/png;base64,…` strings. Consequences:

- they ship **inside the page's JavaScript**, so they are downloaded and parsed as JS
  on every cold visit, and cannot be cached separately;
- `wedding-services.tsx` was a **2.4 MB source file** (98% of it base64), which made
  builds slow and the file unreviewable.

`scripts` converted by `.tmp-extract-inline.js` + `.tmp-webp-inline.js` (kept as
`docs/inline-asset-manifest.json` for provenance): **14 references → 7 unique images**,
extracted to `public/brand/inline/`, re-encoded to WebP with **sharp** (already a
dependency).

| | |
|---|---|
| Raw base64 decoded | 2.08 MB → **1.14 MB** after dedupe |
| Re-encoded to WebP | 1,164 KB → **361 KB** (−69%) |
| `wedding-services.tsx` | 2,421 KB → **40 KB** |
| `SectionVenuesBlock.tsx` | 532 KB → **115 KB** |

### 2. `_app.getInitialProps` forced 28 of 35 routes to render per-request  → **MITIGATED**

`getInitialProps` on `_app` disables Next.js static optimisation: the build reports
**28 routes as `ƒ` (server-rendered on demand) and only 7 as `●` (prerendered)**, and
every navigation did a server round-trip that also fetched `site_settings` from
Supabase.

Fix: the settings read is now **memoised for 30 s** with the *promise* cached, so
concurrent requests share one round-trip instead of stampeding the database
(`src/services/cmsData.ts`, `fetchSiteSettings` → `loadSiteSettingsFromDb` +
`invalidateSiteSettingsCache()`). Edits still appear within 30 s.

**Remaining tradeoff:** this is a cache, not a cure — the routes are still dynamic.
Eliminating it properly means moving the settings read from `_app` into each page's
`getStaticProps` and passing them through the page component (see "what I would do
next" below). I left the architecture intact because the alternative touched all 35
pages.

### 3. A 160 KB PNG used as a 168 px logo  → **FIXED**

`public/brand/vantara-logo.png` is 1684×686 / **159.6 KB**, but the header renders it
at `h-14` (56 px tall) and the footer at `w-72`. Generated with **sharp**:

- `vantara-logo.webp` — 480 px wide, **12.2 KB** (−92%)
- `vantara-logo-240.webp` — **5.6 KB** for small slots

`src/config/site.ts` now points at the WebP (and the live `site_settings.general` row
was updated to match, since the CMS value overrides the config).

### 4. Third-party review widgets: 921 KB across 203 requests  → **IDENTIFIED, deferrable**

`SectionClientReviews` injects `widget.tagembed.com/embed.min.js` (a Taggbox/Tagembed
Instagram feed). Measured cost on the homepage:

| Host | Bytes | Requests |
|---|---|---|
| `widget.tagembed.com` | 254.9 KB | 69 |
| `cdn1.taggbox.com` | 340.5 KB | 6 |
| `cloud.tagbox.com` | 184.7 KB | 8 |
| `api.tagembed.com` | 73.8 KB | 21 |
| `ui-avatars.com` | 66.9 KB | 99 |
| **total** | **920.9 KB** | **203** |

That is **80% of all requests** and 38% of the bytes, and it dwarfs everything else.
It is *already* deferred (injected in `useEffect`, so it never blocks first paint), but
it still competes for bandwidth on mobile — which is exactly where an Indian wedding
audience is.

Added a documented escape hatch: set `NEXT_PUBLIC_DISABLE_TAGEMBED=1` to skip the
loader entirely. **Recommended:** replace the widget with a locally-rendered testimonial
carousel (the site already has `SectionFeaturedListings` as a pattern), or keep the
widget but lazy-load it only when the reviews section scrolls into view.

### 5. Raw, un-optimised hero video  → **NOT FIXED (needs an encoder)**

The hero references **9 video files totalling ~55 MB** (`public/gcpimages/…/*.mp4`,
3.2–8.5 MB each). A phone previously had **both** carousels in the DOM (mobile
`md:hidden` + desktop `md:block`), and CSS `display:none` does **not** stop a browser
fetching an `autoplay` `<video>` — so the theoretical mobile cost was ~21 MB.

The right fix is re-encoding (H.264 → H.264 CRF 28–30 with `-movflags +faststart`, or
better AV1/WebM). **ffmpeg is not installed in this environment and could not be
installed (no outbound network), so the media itself is untouched.** Commands to run
locally:

```bash
# one-off, per file: 3-8 MB -> typically 0.5-1.5 MB at 720p
ffmpeg -i in.mp4 -vf "scale=-2:720" -c:v libx264 -crf 30 -preset slow \
       -an -movflags +faststart out.mp4
```

Then upload each new file through **Admin → Hero Videos → Choose / Upload** (it writes
to Supabase Storage) or drop it in `public/` and point the slide at it.

Other video hygiene still worth doing (each is a small, contained change to
`SectionHero.tsx`):
- render **only one** carousel based on `useIsMobile()` so the other variant's video
  never downloads;
- `preload="none"` on non-active slides, `preload="auto"` only for the active one;
- serve a **poster image first** and let the video start after it paints.

---

## What was changed

| File | Change |
|---|---|
| `src/services/cmsData.ts` | 30 s promise-cached `site_settings` read + `invalidateSiteSettingsCache()` |
| `src/config/site.ts` | logo → `vantara-logo.webp` |
| `src/components/home/SectionHowItWorks.tsx` | inline base64 → `/brand/inline/*.webp` |
| `src/components/home/SectionVenuesBlock.tsx` | 2 blobs → 1 deduped WebP (532 KB → 115 KB source) |
| `src/components/home/SectionWeddingProposals.tsx` | inline base64 → WebP |
| `src/pages/wedding-services.tsx` | 8 blobs → 5 WebP (2,421 KB → 40 KB source) |
| `src/components/home/SectionClientReviews.tsx` | `NEXT_PUBLIC_DISABLE_TAGEMBED` escape hatch |
| `public/brand/inline/*.webp` | 7 new cacheable images (361 KB total) |
| `public/brand/vantara-logo*.webp` | 12.2 KB + 5.6 KB |
| `supabase` `site_settings.general` | `logoUrl` → WebP |
| `docs/inline-asset-manifest.json` | provenance for every extracted blob |

Gates after the changes: `tsc --noEmit` **0**, `eslint --max-warnings 0` **0**,
`next build` **0**.

---

## What I would do next, in order of impact

1. **Re-encode the hero videos** (bottleneck #5). Expect 55 MB → ~5 MB, the single
   biggest remaining win for mobile users.
2. **Deal with the Taggbox widget** (bottleneck #4): 921 KB / 203 requests for a
   reviews feed. Lazy-load it on scroll, or render testimonials locally.
3. **Restore static generation** (bottleneck #2): move `site_settings` out of
   `_app.getInitialProps` into each page's `getStaticProps`. 28 routes go back to `●`
   and every navigation stops hitting the server.
4. **Self-host the fonts or subset them.** `next/font` already self-hosts (no Google
   request), but the homepage still transfers **0.41–0.48 MB** of woff/woff2 for five
   families. Most pages need two; subset to Latin + the glyphs actually used.
5. **Resize the largest local images.** `/media/flower-pattern…webp` is 172 KB and is
   used as a decorative background — a 2x-sized, quality-75 version would be ~40 KB.
6. **Move `public/` media to object storage + CDN** once traffic is real, so the
   ~600 MB repo stops being your delivery mechanism.
