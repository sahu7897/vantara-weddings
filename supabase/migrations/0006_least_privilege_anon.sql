-- ═══════════════════════════════════════════════════════════════════════════
-- Vantara Weddings — 0006: least-privilege grants for anon.
--
-- Caught by live verification (#3): Supabase grants EVERY new public table to
-- `anon` (ALL privileges) by default, so 0002's explicit grants were
-- redundant and anon could *attempt* reads/writes on every table — RLS
-- returned empty sets instead of hard denials. Defense in depth: revoke the
-- blanket defaults, then grant exactly what §13.4 allows anon:
--   SELECT on the public directory tables, INSERT on leads (public intake).
-- `authenticated` keeps full DML — RLS row policies scope every table.
-- ═══════════════════════════════════════════════════════════════════════════

revoke all on all tables in schema public from anon;

-- Cover tables created in future as well (Supabase's own default privileges
-- re-grant anon; this narrows them permanently for postgres-created tables).
alter default privileges in schema public revoke all on tables from anon;

grant usage on schema public to anon;

grant select on public.vendors, public.venues, public.vendor_media,
               public.cities, public.localities to anon;
grant insert on public.leads to anon;
