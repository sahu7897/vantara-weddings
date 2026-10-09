/**
 * Admin → vendor add/edit form (Phase 5 §13.7). Writes `vendors` through the
 * admin's own session — RLS (0002) is the access control; the service key
 * never appears here. Status is intentionally NOT a field: approval happens
 * only via the queue's Approve/Reject buttons so owner-role sync stays in one
 * place. Existing vendors also get the §13.5 media manager (≤1 MB, webp/jpg/
 * png, `<vendor_id>/…` paths).
 */
import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  ACCEPTED_MEDIA_ATTR,
  MAX_MEDIA_BYTES,
  deleteVendorMedia,
  publicMediaUrl,
  uploadVendorMedia,
} from '@/lib/media/upload';
import type { CityRow, VendorCategory, VendorMediaRow, VendorRow } from '@/lib/supabase/types';

const CATEGORIES: { value: VendorCategory; label: string }[] = [
  { value: 'venue', label: 'Venue' },
  { value: 'decor', label: 'Decor' },
  { value: 'photography', label: 'Photography' },
  { value: 'catering', label: 'Catering' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'dj', label: 'DJ / Sound' },
  { value: 'other', label: 'Other' },
];

interface Props {
  /** null = create mode. */
  vendor: VendorRow | null;
  cities: CityRow[];
  onSaved: (vendor: VendorRow) => void;
  onCancel: () => void;
}

const label = 'block text-xs font-semibold text-gray-500 mb-1';
const field =
  'w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#FF5B95]';

/** Shown instead of an unhandled throw when the build has no Supabase keys. */
const NOT_CONFIGURED =
  'Supabase is not configured in this build — add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and rebuild.';

export default function VendorForm({ vendor, cities, onSaved, onCancel }: Props) {
  const [businessName, setBusinessName] = useState(vendor?.business_name ?? '');
  const [category, setCategory] = useState<VendorCategory>(vendor?.category ?? 'decor');
  const [city, setCity] = useState(vendor?.city ?? cities[0]?.slug ?? 'banda');
  const [locality, setLocality] = useState(vendor?.locality ?? '');
  const [description, setDescription] = useState(vendor?.description ?? '');
  const [priceMin, setPriceMin] = useState(vendor?.price_min == null ? '' : String(vendor.price_min));
  const [priceMax, setPriceMax] = useState(vendor?.price_max == null ? '' : String(vendor.price_max));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsePrice = (value: string, fieldName: string): number | null => {
    if (value.trim() === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error(`${fieldName} must be a number ≥ 0.`);
    }
    return parsed;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!businessName.trim()) {
      setError('Business name is required.');
      return;
    }
    let payload: Record<string, unknown>;
    try {
      const min = parsePrice(priceMin, 'Minimum price');
      const max = parsePrice(priceMax, 'Maximum price');
      if (min != null && max != null && max < min) {
        throw new Error('Maximum price cannot be less than the minimum price.');
      }
      payload = {
        business_name: businessName.trim(),
        category,
        city,
        locality: locality.trim() || null,
        description: description.trim() || null,
        price_min: min,
        price_max: max,
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
      const result = vendor
        ? await supabase.from('vendors').update(payload).eq('id', vendor.id).select('*').single()
        : await supabase.from('vendors').insert(payload).select('*').single();
      if (result.error) {
        setError(result.error.message);
        return;
      }
      onSaved(result.data as VendorRow);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#7B0242]">
          {vendor ? `Edit ${vendor.business_name}` : 'Add a vendor'}
        </h3>
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
        <div className="sm:col-span-2">
          <label className={label} htmlFor="vf-business">
            Business name *
          </label>
          <input
            id="vf-business"
            className={field}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Sharma Decor House"
            required
          />
        </div>
        <div>
          <label className={label} htmlFor="vf-category">
            Category
          </label>
          <select
            id="vf-category"
            className={field}
            value={category}
            onChange={(e) => setCategory(e.target.value as VendorCategory)}
          >
            {CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="vf-city">
            City
          </label>
          <select id="vf-city" className={field} value={city} onChange={(e) => setCity(e.target.value)}>
            {cities.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.name}
              </option>
            ))}
            {!cities.some((option) => option.slug === city) && <option value={city}>{city}</option>}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="vf-locality">
            Locality
          </label>
          <input
            id="vf-locality"
            className={field}
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            placeholder="e.g. Civil Lines"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="vf-price-min">
              Min price (₹)
            </label>
            <input
              id="vf-price-min"
              className={field}
              inputMode="decimal"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="15000"
            />
          </div>
          <div>
            <label className={label} htmlFor="vf-price-max">
              Max price (₹)
            </label>
            <input
              id="vf-price-max"
              className={field}
              inputMode="decimal"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="80000"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="vf-description">
            Description
          </label>
          <textarea
            id="vf-description"
            className={`${field} min-h-[96px]`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this vendor offer?"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#FF5B95] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-50"
        >
          {saving ? 'Saving…' : vendor ? 'Save changes' : 'Create vendor'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>

      {vendor && <MediaManager vendor={vendor} />}
    </form>
  );
}

/** §13.5 media manager — upload, preview, delete for one vendor. */
function MediaManager({ vendor }: { vendor: VendorRow }) {
  const [media, setMedia] = useState<VendorMediaRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMedia = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError(NOT_CONFIGURED);
      return;
    }
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: loadError } = await supabase
        .from('vendor_media')
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: true });
      if (loadError) setError(loadError.message);
      else setMedia((data ?? []) as VendorMediaRow[]);
    } catch (loadFailure) {
      setError(loadFailure instanceof Error ? loadFailure.message : String(loadFailure));
    }
  }, [vendor.id]);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isSupabaseConfigured()) {
      setError(NOT_CONFIGURED);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await uploadVendorMedia(supabase, vendor.id, file);
      await loadMedia();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
    }
    setBusy(false);
  };

  const handleDelete = async (row: VendorMediaRow) => {
    if (!isSupabaseConfigured()) {
      setError(NOT_CONFIGURED);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await deleteVendorMedia(supabase, row);
      await loadMedia();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    }
    setBusy(false);
  };

  return (
    <div className="border-t border-gray-100 pt-5">
      <h4 className="text-sm font-bold text-gray-700">Photos &amp; videos</h4>
      <p className="mt-1 text-xs text-gray-400">
        webp / jpg / png · max 1 MB each · stored in the public <code>vendor-media</code> bucket under{' '}
        <code>{vendor.id}/…</code>
      </p>

      <label className={`mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-[#FF5B95] ${busy ? 'opacity-50' : ''}`}>
        {busy ? 'Working…' : '+ Upload image'}
        <input
          type="file"
          accept={ACCEPTED_MEDIA_ATTR}
          className="hidden"
          disabled={busy}
          onChange={(e) => void handleUpload(e)}
        />
      </label>
      <span className="ml-3 text-xs text-gray-400">≤ {Math.round(MAX_MEDIA_BYTES / 1024 / 1024)} MB</span>

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {media.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">No media yet.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {media.map((row) => {
            if (!isSupabaseConfigured()) return null;
            const supabase = getSupabaseBrowserClient();
            return (
              <li key={row.id} className="group relative overflow-hidden rounded-xl border border-gray-200">
                <img
                  src={publicMediaUrl(supabase, row.storage_path)}
                  alt={row.alt_text ?? 'Vendor media'}
                  className="h-28 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => void handleDelete(row)}
                  disabled={busy}
                  className="absolute right-1.5 top-1.5 rounded-lg bg-black/60 px-2 py-1 text-[11px] font-bold text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-50"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
