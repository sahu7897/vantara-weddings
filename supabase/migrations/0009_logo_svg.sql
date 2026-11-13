-- ═══════════════════════════════════════════════════════════════════════════
-- Vantara Weddings — 0009: point the header/footer logo at the cropped SVG.
--
-- WHY THIS IS NEEDED
-- Migrations 0007 and 0008 seeded `general.logoUrl` = /brand/vantara-logo.png.
-- A stored site_settings row overrides src/config/site.ts (see
-- src/lib/cms/loadSiteSettings.ts), so changing the code default alone would
-- leave the live header and footer on the old PNG.
--
-- Only logoUrl changes. jsonb_set keeps name, shortName, tagline and
-- faviconUrl exactly as stored. seo.defaultOgImage is deliberately left as a
-- PNG: social-share crawlers do not render SVG previews.
-- ═══════════════════════════════════════════════════════════════════════════

update public.site_settings
   set value = jsonb_set(value, '{logoUrl}', '"/brand/vantara-logo-transparent.svg"'::jsonb, true),
       updated_at = now()
 where key = 'general';

-- ── verification ────────────────────────────────────────────────────────────
do $$
declare
  g jsonb;
begin
  select value into g from public.site_settings where key = 'general';
  if g is not null and coalesce(g->>'logoUrl', '') <> '/brand/vantara-logo-transparent.svg' then
    raise exception '0009: general.logoUrl was not updated to the SVG logo';
  end if;
  raise notice '0009 OK — general.logoUrl: %', g->>'logoUrl';
end $$;
