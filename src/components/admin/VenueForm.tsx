/**
 * Admin → venue details form (Phase 5 §13.7): one `venues` row per venue
 * vendor, created/edited through the admin session (RLS 0002 gates who may
 * write; the form never touches the service key).
 */
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { VenueRow, VendorRow } from '@/lib/supabase/types';

interface Props {
  vendor: VendorRow;
  onSaved: (venue: VenueRow) => void;
  onCancel: () => void;
}

const label = 'block text-xs font-semibold text-gray-500 mb-1';
const field =
  'w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#FF5B95]';

/** Shown instead of an unhandled throw when the build has no Supabase keys. */
const NOT_CONFIGURED =
  'Supabase is not configured in this build — add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and rebuild.';

interface FormState {
  capacityMin: string;
  capacityMax: string;
  priceVeg: string;
  priceNonVeg: string;
  rental: string;
  indoorOutdoor: string;
  address: string;
  lat: string;
  lng: string;
}

const EMPTY: FormState = {
  capacityMin: '',
  capacityMax: '',
  priceVeg: '',
  priceNonVeg: '',
  rental: '',
  indoorOutdoor: '',
  address: '',
  lat: '',
  lng: '',
};

function toForm(venue: VenueRow | null): FormState {
  if (!venue) return EMPTY;
  return {
    capacityMin: venue.capacity_min == null ? '' : String(venue.capacity_min),
    capacityMax: venue.capacity_max == null ? '' : String(venue.capacity_max),
    priceVeg: venue.price_per_plate_veg == null ? '' : String(venue.price_per_plate_veg),
    priceNonVeg: venue.price_per_plate_nonveg == null ? '' : String(venue.price_per_plate_nonveg),
    rental: venue.rental_price == null ? '' : String(venue.rental_price),
    indoorOutdoor: venue.indoor_outdoor ?? '',
    address: venue.address ?? '',
    lat: venue.lat == null ? '' : String(venue.lat),
    lng: venue.lng == null ? '' : String(venue.lng),
  };
}

function parseNumber(value: string, fieldName: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a number ≥ 0.`);
  }
  return parsed;
}

export default function VenueForm({ vendor, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!isSupabaseConfigured()) {
      setError(NOT_CONFIGURED);
      setLoading(false);
      return;
    }
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: loadError } = await supabase
        .from('venues')
        .select('*')
        .eq('vendor_id', vendor.id)
        .maybeSingle();
      if (loadError) setError(loadError.message);
      const venue = (data as VenueRow | null) ?? null;
      setVenueId(venue?.id ?? null);
      setForm(toForm(venue));
    } catch (loadFailure) {
      setError(loadFailure instanceof Error ? loadFailure.message : String(loadFailure));
    } finally {
      setLoading(false);
    }
  }, [vendor.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (key: keyof FormState) => (event: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    let payload: Record<string, unknown>;
    try {
      const capacityMin = parseNumber(form.capacityMin, 'Minimum capacity');
      const capacityMax = parseNumber(form.capacityMax, 'Maximum capacity');
      if (
        capacityMin != null &&
        capacityMax != null &&
        capacityMax < capacityMin
      ) {
        throw new Error('Maximum capacity cannot be less than the minimum.');
      }
      const lat = parseNumber(form.lat, 'Latitude');
      const lng = parseNumber(form.lng, 'Longitude');
      if (lat != null && (lat < -90 || lat > 90)) {
        throw new Error('Latitude must be between -90 and 90.');
      }
      if (lng != null && (lng < -180 || lng > 180)) {
        throw new Error('Longitude must be between -180 and 180.');
      }
      payload = {
        capacity_min: capacityMin == null ? null : Math.trunc(capacityMin),
        capacity_max: capacityMax == null ? null : Math.trunc(capacityMax),
        price_per_plate_veg: parseNumber(form.priceVeg, 'Veg price per plate'),
        price_per_plate_nonveg: parseNumber(form.priceNonVeg, 'Non-veg price per plate'),
        rental_price: parseNumber(form.rental, 'Rental price'),
        indoor_outdoor: form.indoorOutdoor || null,
        address: form.address.trim() || null,
        lat,
        lng,
      };
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : String(validationError));
      return;
    }

    if (!isSupabaseConfigured()) {
      setError(NOT_CONFIGURED);
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const result = venueId
        ? await supabase.from('venues').update(payload).eq('id', venueId).select('*').single()
        : await supabase.from('venues').insert({ ...payload, vendor_id: vendor.id }).select('*').single();
      if (result.error) {
        setError(result.error.message);
        return;
      }
      onSaved(result.data as VenueRow);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
        Loading venue details…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#7B0242]">Venue details — {vendor.business_name}</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-semibold text-gray-500 underline-offset-2 hover:underline"
        >
          ← Back to list
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="vf-cap-min">
              Min capacity
            </label>
            <input id="vf-cap-min" className={field} inputMode="numeric" value={form.capacityMin} onChange={set('capacityMin')} placeholder="100" />
          </div>
          <div>
            <label className={label} htmlFor="vf-cap-max">
              Max capacity
            </label>
            <input id="vf-cap-max" className={field} inputMode="numeric" value={form.capacityMax} onChange={set('capacityMax')} placeholder="500" />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="vf-indoor">
            Indoor / outdoor
          </label>
          <select id="vf-indoor" className={field} value={form.indoorOutdoor} onChange={set('indoorOutdoor')}>
            <option value="">— not set —</option>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="vf-veg">
              Veg ₹/plate
            </label>
            <input id="vf-veg" className={field} inputMode="decimal" value={form.priceVeg} onChange={set('priceVeg')} placeholder="450" />
          </div>
          <div>
            <label className={label} htmlFor="vf-nonveg">
              Non-veg ₹/plate
            </label>
            <input id="vf-nonveg" className={field} inputMode="decimal" value={form.priceNonVeg} onChange={set('priceNonVeg')} placeholder="650" />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="vf-rental">
            Rental price (₹)
          </label>
          <input id="vf-rental" className={field} inputMode="decimal" value={form.rental} onChange={set('rental')} placeholder="40000" />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="vf-address">
            Address
          </label>
          <textarea id="vf-address" className={`${field} min-h-[72px]`} value={form.address} onChange={set('address')} placeholder="Landmark, city, state" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="vf-lat">
              Latitude
            </label>
            <input id="vf-lat" className={field} inputMode="decimal" value={form.lat} onChange={set('lat')} placeholder="25.4836" />
          </div>
          <div>
            <label className={label} htmlFor="vf-lng">
              Longitude
            </label>
            <input id="vf-lng" className={field} inputMode="decimal" value={form.lng} onChange={set('lng')} placeholder="80.3396" />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#FF5B95] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-50"
        >
          {saving ? 'Saving…' : venueId ? 'Save changes' : 'Create venue details'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
