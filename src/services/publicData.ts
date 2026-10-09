/**
 * Public directory data accessors (Phase 5 §13.6) — replaces the old TWC API
 * client entirely (O2: no TWC endpoint is ever called).
 *
 * - SERVER-SIDE ONLY: imported from getStaticProps/getServerSideProps (Next
 *   tree-shakes it out of the client bundle). Uses plain supabase-js with the
 *   ANON key — the service-role key never comes near this file, and RLS
 *   decides which rows come back (approved vendors + their venues/media).
 * - FAILS SOFT: every fetcher returns an empty result and warns instead of
 *   throwing, so a missing env or a Supabase outage can never break
 *   `next build` — pages just render their §13.6 empty state.
 */
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicMediaUrl } from '@/lib/media/upload';
import type { CityRow, LocalityRow, VendorCategory, VendorRow, VenueRow } from '@/lib/supabase/types';

/** venues row + its vendor (join is `!inner`, so the vendor always exists). */
export interface VenueWithVendor extends VenueRow {
  vendors: VendorRow;
}

let cachedClient: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cachedClient = url && anonKey ? createClient(url, anonKey) : null;
  if (!cachedClient) {
    console.warn('[publicData] Supabase env not set — public pages will render empty states.');
  }
  return cachedClient;
}

/** True when the NEXT_PUBLIC_* values are available to server-side fetches. */
export function isPublicDataConfigured(): boolean {
  return getClient() !== null;
}

function warn(where: string, message: string): void {
  console.warn(`[publicData] ${where}: ${message}`);
}

export async function fetchCities(): Promise<CityRow[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) {
    warn('fetchCities', error.message);
    return [];
  }
  return (data ?? []) as CityRow[];
}

export async function fetchCity(citySlug: string): Promise<CityRow | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .eq('slug', citySlug)
    .maybeSingle();
  if (error) {
    warn('fetchCity', error.message);
    return null;
  }
  return (data as CityRow | null) ?? null;
}

export async function fetchLocalities(citySlug: string): Promise<LocalityRow[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('localities')
    .select('*')
    .eq('city_slug', citySlug)
    .order('name', { ascending: true });
  if (error) {
    warn('fetchLocalities', error.message);
    return [];
  }
  return (data ?? []) as LocalityRow[];
}

export async function fetchLocality(
  citySlug: string,
  localitySlug: string,
): Promise<LocalityRow | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('localities')
    .select('*')
    .eq('city_slug', citySlug)
    .eq('slug', localitySlug)
    .maybeSingle();
  if (error) {
    warn('fetchLocality', error.message);
    return null;
  }
  return (data as LocalityRow | null) ?? null;
}

/**
 * Approved vendors only — RLS exposes approved rows to anon, and the explicit
 * filter keeps intent readable (and matches if this is ever run with a
 * privileged connection by mistake).
 */
export async function fetchApprovedVendors(
  opts: { category?: VendorCategory; city?: string } = {},
): Promise<VendorRow[]> {
  const supabase = getClient();
  if (!supabase) return [];
  let query = supabase.from('vendors').select('*').eq('status', 'approved');
  if (opts.category) query = query.eq('category', opts.category);
  if (opts.city) query = query.eq('city', opts.city);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    warn('fetchApprovedVendors', error.message);
    return [];
  }
  return (data ?? []) as VendorRow[];
}

/**
 * Venue listings joined with their vendor. Filters ride the `!inner` join:
 * PostgREST drops venues whose vendor doesn't match.
 *
 * `localityName` matches `vendors.locality` (free text) against a localities
 * NAME — vendors store the human-readable area, the localities table owns the
 * slug. Keep vendor admin edits in sync with locality names.
 */
export async function fetchVenues(
  opts: { city?: string; localityName?: string; limit?: number } = {},
): Promise<VenueWithVendor[]> {
  const supabase = getClient();
  if (!supabase) return [];
  let query = supabase.from('venues').select('*, vendors!inner(*)');
  if (opts.city) query = query.eq('vendors.city', opts.city);
  if (opts.localityName) query = query.eq('vendors.locality', opts.localityName);
  let ordered = query.order('created_at', { ascending: false });
  if (opts.limit) ordered = ordered.limit(opts.limit);
  const { data, error } = await ordered;
  if (error) {
    warn('fetchVenues', error.message);
    return [];
  }
  return (data ?? []) as VenueWithVendor[];
}

/** Venue detail by id (callers validate the uuid first — see the pages). */
export async function fetchVenue(venueId: string): Promise<VenueWithVendor | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('venues')
    .select('*, vendors!inner(*)')
    .eq('id', venueId)
    .maybeSingle();
  if (error) {
    warn('fetchVenue', error.message);
    return null;
  }
  return (data as VenueWithVendor | null) ?? null;
}

/**
 * One thumbnail path per vendor (earliest by sort_order). Returns the public
 * URL; vendors without media simply get no entry (cards show a placeholder).
 */
export async function fetchVendorThumbs(
  vendorIds: string[],
): Promise<Record<string, string>> {
  const thumbs: Record<string, string> = {};
  const supabase = getClient();
  if (!supabase || vendorIds.length === 0) return thumbs;
  const { data, error } = await supabase
    .from('vendor_media')
    .select('vendor_id, storage_path, sort_order')
    .in('vendor_id', vendorIds)
    .order('sort_order', { ascending: true });
  if (error) {
    warn('fetchVendorThumbs', error.message);
    return thumbs;
  }
  for (const row of (data ?? []) as { vendor_id: string; storage_path: string }[]) {
    if (!thumbs[row.vendor_id]) {
      thumbs[row.vendor_id] = publicMediaUrl(supabase, row.storage_path);
    }
  }
  return thumbs;
}
