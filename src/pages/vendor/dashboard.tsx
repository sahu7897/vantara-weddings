/**
 * /vendor/dashboard — vendor home (Phase 5 §13.2, §13.7). Server-side guarded:
 * signed-in users with role vendor (or admin) only; everyone else is redirected
 * to their role home.
 *
 * Stage 5 scope, implemented here:
 *   - profile editor (business details + price band; `status` is deliberately
 *     NOT editable — a guard trigger in 0002 makes status/approval admin-only)
 *   - media manager (≤1 MB webp/jpg/png into the `vendor-media` bucket under
 *     `<vendor_id>/…`, matching the 0003 storage policies)
 *   - "my leads" (only leads assigned to this vendor — RLS enforces it too)
 *   - "my bookings" with the vendor's own commission figures
 *
 * Every read/write runs through the vendor's own session, so RLS is the access
 * control and the service role key never reaches the browser. Until this was
 * built the route was an honest placeholder shell, so vendors could sign in but
 * could not manage anything.
 */
import Head from 'next/head';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { site } from '@/config/site';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import { ROLE_LABEL } from '@/lib/auth/roles';
import { requireAuth } from '@/lib/auth/gssp';
import { createGsspSupabase, isSupabaseConfiguredServer } from '@/lib/supabase/server';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  ACCEPTED_MEDIA_ATTR,
  deleteVendorMedia,
  publicMediaUrl,
  uploadVendorMedia,
  validateMediaFile,
} from '@/lib/media/upload';
import type {
  BookingStatus,
  LeadStatus,
  VendorCategory,
  VendorMediaRow,
  VendorStatus,
} from '@/lib/supabase/types';

/** How many assigned leads we surface on one page. */
const LEADS_SHOWN = 50;

interface VendorProfile {
  id: string;
  businessName: string;
  category: VendorCategory;
  city: string;
  locality: string | null;
  description: string | null;
  priceMin: number | null;
  priceMax: number | null;
  status: VendorStatus;
}

interface VendorLead {
  id: string;
  name: string;
  phone: string;
  city: string | null;
  eventDate: string | null;
  budgetRange: string | null;
  guestCount: number | null;
  status: LeadStatus;
  createdAt: string;
}

interface VendorBooking {
  id: string;
  eventDate: string;
  amount: number;
  commissionPercent: number;
  commissionAmount: number;
  status: BookingStatus;
}

interface MediaItem {
  id: string;
  storagePath: string;
  url: string;
  altText: string | null;
}

interface VendorDashboardProps {
  configured: boolean;
  role: 'customer' | 'vendor' | 'admin';
  phone: string;
  email: string;
  memberSince: string | null;
  vendor: VendorProfile | null;
  leads: VendorLead[];
  bookings: VendorBooking[];
  media: MediaItem[];
}

const CATEGORY_OPTIONS: { value: VendorCategory; label: string }[] = [
  { value: 'venue', label: 'Venue' },
  { value: 'decor', label: 'Decor' },
  { value: 'photography', label: 'Photography' },
  { value: 'catering', label: 'Catering' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'dj', label: 'DJ' },
  { value: 'other', label: 'Other' },
];

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  booked: 'Booked',
  lost: 'Closed',
};

const BOOKING_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const field =
  'w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#7B0242] focus:ring-1 focus:ring-[#7B0242]';

const baseGuard = requireAuth({ path: '/vendor/dashboard', roles: ['vendor', 'admin'] });

export const getServerSideProps: GetServerSideProps<VendorDashboardProps> = async (ctx) => {
  const guarded = await baseGuard(ctx);
  // requireAuth returns { props } when authorised, or a { redirect } result.
  if (!('props' in guarded)) return guarded;

  const authProps = (await guarded.props) as Omit<
    VendorDashboardProps,
    'vendor' | 'leads' | 'bookings' | 'media'
  >;
  const empty = { vendor: null, leads: [], bookings: [], media: [] };

  if (!authProps.configured || !isSupabaseConfiguredServer()) {
    return { props: { ...authProps, ...empty } };
  }

  try {
    const supabase = createGsspSupabase(ctx);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { props: { ...authProps, ...empty } };

    // The vendor row owned by this user. RLS ("own or admin") already limits
    // this to the caller's own row for a vendor session.
    const { data: vendorRow } = await supabase
      .from('vendors')
      .select('*')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (!vendorRow) return { props: { ...authProps, ...empty } };

    const vendor: VendorProfile = {
      id: vendorRow.id,
      businessName: vendorRow.business_name,
      category: vendorRow.category,
      city: vendorRow.city,
      locality: vendorRow.locality,
      description: vendorRow.description,
      priceMin: vendorRow.price_min,
      priceMax: vendorRow.price_max,
      status: vendorRow.status,
    };

    const [leadsResult, bookingsResult, mediaResult] = await Promise.all([
      supabase
        .from('leads')
        .select('*')
        .eq('assigned_vendor_id', vendor.id)
        .order('created_at', { ascending: false })
        .limit(LEADS_SHOWN),
      supabase
        .from('bookings')
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('event_date', { ascending: false }),
      supabase
        .from('vendor_media')
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('sort_order', { ascending: true }),
    ]);

    const leads: VendorLead[] = (leadsResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      city: row.city,
      eventDate: row.event_date,
      budgetRange: row.budget_range,
      guestCount: row.guest_count,
      status: row.status,
      createdAt: row.created_at,
    }));

    const bookings: VendorBooking[] = (bookingsResult.data ?? []).map((row) => ({
      id: row.id,
      eventDate: row.event_date,
      amount: row.amount,
      commissionPercent: row.commission_percent,
      commissionAmount: row.commission_amount,
      status: row.status,
    }));

    const media: MediaItem[] = ((mediaResult.data ?? []) as VendorMediaRow[]).map((row) => ({
      id: row.id,
      storagePath: row.storage_path,
      // Public-read bucket, so a plain URL is correct (no signed URL needed).
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/vendor-media/${row.storage_path}`,
      altText: row.alt_text,
    }));

    return { props: { ...authProps, vendor, leads, bookings, media } };
  } catch {
    return { props: { ...authProps, ...empty } };
  }
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

export default function VendorDashboardPage({
  configured,
  role,
  phone,
  email,
  vendor: initialVendor,
  leads,
  bookings,
  media: initialMedia,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [vendor, setVendor] = useState(initialVendor);
  const [media, setMedia] = useState(initialMedia);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setVendor(initialVendor), [initialVendor]);
  useEffect(() => setMedia(initialMedia), [initialMedia]);

  const handleSignOut = async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.assign('/login');
  };

  const saveProfile = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!vendor) return;
      setSaving(true);
      setNotice(null);
      setError(null);
      try {
        const supabase = getSupabaseBrowserClient();
        // `status` is intentionally absent: a 0002 guard trigger restricts
        // status changes to admins, so including it would fail the whole write.
        const { error: updateError } = await supabase
          .from('vendors')
          .update({
            business_name: vendor.businessName,
            category: vendor.category,
            city: vendor.city,
            locality: vendor.locality,
            description: vendor.description,
            price_min: vendor.priceMin,
            price_max: vendor.priceMax,
          })
          .eq('id', vendor.id);
        if (updateError) throw new Error(updateError.message);
        setNotice('Profile saved.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save the profile.');
      } finally {
        setSaving(false);
      }
    },
    [vendor],
  );

  const onUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !vendor) return;
      setNotice(null);
      setError(null);
      const invalid = validateMediaFile(file);
      if (invalid) {
        setError(invalid);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      try {
        const supabase = getSupabaseBrowserClient();
        const row = await uploadVendorMedia(supabase, vendor.id, file);
        setMedia((prev) => [
          ...prev,
          {
            id: row.id,
            storagePath: row.storage_path,
            url: publicMediaUrl(supabase, row.storage_path),
            altText: row.alt_text,
          },
        ]);
        setNotice('Photo uploaded.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [vendor],
  );

  const onDeleteMedia = useCallback(async (item: MediaItem) => {
    setNotice(null);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await deleteVendorMedia(supabase, { id: item.id, storage_path: item.storagePath });
      setMedia((prev) => prev.filter((row) => row.id !== item.id));
      setNotice('Photo removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the photo.');
    }
  }, []);

  return (
    <>
      <Head>
        <title>{`Vendor dashboard | ${site.name}`}</title>
      </Head>
      <SiteHeader variant="sticky" />

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Vendor dashboard</h1>
          <p className="text-sm text-gray-500">
            Signed in as <span className="font-semibold text-gray-700">{email || phone}</span>
            <span className="ml-2 rounded-full bg-pink-50 px-2.5 py-1 text-xs font-semibold text-[#7B0242]">
              {ROLE_LABEL[role]}
            </span>
          </p>
        </div>

        {!configured ? (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            Supabase isn&apos;t configured in this build — add the keys from{' '}
            <code className="font-mono">.env.example</code> to <code className="font-mono">.env.local</code> and
            rebuild.
          </div>
        ) : !vendor ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <p className="font-semibold text-gray-700">No vendor profile linked to this account yet.</p>
            <p className="mt-2 text-sm text-gray-500">
              Register as a partner and our team links your listing to this account during approval.
              You can then manage photos, leads and bookings here.
            </p>
            <a
              href="/lp/partner-onboarding-form"
              className="mt-5 inline-block rounded-xl bg-[#7B0242] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Register as a partner
            </a>
          </div>
        ) : (
          <>
            {vendor.status !== 'approved' && (
              <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                Your listing is <span className="font-semibold">{vendor.status}</span> and is not publicly
                visible yet — our team reviews new partners before they appear in the directory. You can
                still prepare your profile and photos below.
              </div>
            )}
            {notice && (
              <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                {notice}
              </div>
            )}
            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* ── Profile ─────────────────────────────────────────────── */}
            <h2 className="mt-10 text-xl font-bold text-[#7B0242]">Business profile</h2>
            <form
              onSubmit={saveProfile}
              className="mt-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)]"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="vp-name" className="mb-1 block text-xs font-semibold text-gray-700">
                    Business name
                  </label>
                  <input
                    id="vp-name"
                    className={field}
                    required
                    value={vendor.businessName}
                    onChange={(e) => setVendor({ ...vendor, businessName: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="vp-category" className="mb-1 block text-xs font-semibold text-gray-700">
                    Category
                  </label>
                  <select
                    id="vp-category"
                    className={field}
                    value={vendor.category}
                    onChange={(e) =>
                      setVendor({ ...vendor, category: e.target.value as VendorCategory })
                    }
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="vp-city" className="mb-1 block text-xs font-semibold text-gray-700">
                    City
                  </label>
                  <input
                    id="vp-city"
                    className={field}
                    required
                    value={vendor.city}
                    onChange={(e) => setVendor({ ...vendor, city: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="vp-locality" className="mb-1 block text-xs font-semibold text-gray-700">
                    Locality (optional)
                  </label>
                  <input
                    id="vp-locality"
                    className={field}
                    value={vendor.locality ?? ''}
                    onChange={(e) => setVendor({ ...vendor, locality: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="vp-min" className="mb-1 block text-xs font-semibold text-gray-700">
                    Starting price (₹)
                  </label>
                  <input
                    id="vp-min"
                    className={field}
                    inputMode="numeric"
                    value={vendor.priceMin ?? ''}
                    onChange={(e) =>
                      setVendor({
                        ...vendor,
                        priceMin: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label htmlFor="vp-max" className="mb-1 block text-xs font-semibold text-gray-700">
                    Maximum price (₹)
                  </label>
                  <input
                    id="vp-max"
                    className={field}
                    inputMode="numeric"
                    value={vendor.priceMax ?? ''}
                    onChange={(e) =>
                      setVendor({
                        ...vendor,
                        priceMax: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="mt-4">
                <label htmlFor="vp-desc" className="mb-1 block text-xs font-semibold text-gray-700">
                  What does your business offer?
                </label>
                <textarea
                  id="vp-desc"
                  className={`${field} min-h-[96px]`}
                  value={vendor.description ?? ''}
                  onChange={(e) => setVendor({ ...vendor, description: e.target.value })}
                />
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Approval status is managed by the Vantara team and cannot be changed here.
              </p>
              <button
                type="submit"
                disabled={saving}
                className="mt-4 rounded-xl bg-[#7B0242] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </form>

            {/* ── Media ───────────────────────────────────────────────── */}
            <h2 className="mt-10 text-xl font-bold text-[#7B0242]">Photos</h2>
            <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)]">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_MEDIA_ATTR}
                onChange={onUpload}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-xl file:border-0 file:bg-[#7B0242] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
              <p className="mt-2 text-xs text-gray-400">WebP, JPG or PNG · up to 1 MB per photo.</p>
              {media.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  No photos yet. Listings with photos get noticeably more enquiries.
                </p>
              ) : (
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {media.map((item) => (
                    <li key={item.id} className="relative overflow-hidden rounded-xl border border-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.altText || vendor.businessName}
                        className="h-28 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => void onDeleteMedia(item)}
                        className="absolute right-1.5 top-1.5 rounded-lg bg-black/60 px-2 py-1 text-xs font-semibold text-white"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ── Leads ───────────────────────────────────────────────── */}
            <h2 className="mt-10 text-xl font-bold text-[#7B0242]">My leads</h2>
            {leads.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <p className="text-sm text-gray-500">
                  No enquiries assigned to you yet. Our team assigns customer enquiries to matching
                  vendors — they appear here with contact details.
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)]">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3">Budget</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-semibold text-gray-800">{lead.name}</td>
                        <td className="px-4 py-3">
                          <a className="text-[#7B0242] underline" href={`tel:${lead.phone}`}>
                            {lead.phone}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {lead.eventDate ? formatDate(lead.eventDate) : '—'}
                          {lead.city ? ` · ${lead.city}` : ''}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{lead.budgetRange || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-pink-50 px-2.5 py-1 text-xs font-semibold text-[#7B0242]">
                            {STATUS_LABEL[lead.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(lead.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Bookings ────────────────────────────────────────────── */}
            <h2 className="mt-10 text-xl font-bold text-[#7B0242]">My bookings</h2>
            {bookings.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <p className="text-sm text-gray-500">
                  No confirmed bookings yet. Once a lead converts, the booking and your commission
                  breakdown appear here.
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)]">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Event date</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Commission</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-semibold text-gray-800">
                          {formatDate(booking.eventDate)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatMoney(booking.amount)}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatMoney(booking.commissionAmount)} ({booking.commissionPercent}%)
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                            {BOOKING_LABEL[booking.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="mt-10 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Sign out
            </button>
          </>
        )}
      </section>

      <SiteFooter />
    </>
  );
}
