/**
 * Admin → Vendors (Phase 5 §13.7): the approval queue + CRUD entry point.
 * - Approve/Reject flips `vendors.status` AND syncs the owner's
 *   `profiles.role` (vendor ↔ customer) — role changes are admin-only under
 *   RLS/guard triggers (0002/0005), which this session satisfies.
 * - Add/Edit opens VendorForm (with §13.5 media manager); venue-category
 *   vendors open VenueForm for their `venues` row.
 */
import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import VendorForm from '@/components/admin/VendorForm';
import VenueForm from '@/components/admin/VenueForm';
import type { CityRow, VendorRow, VendorStatus } from '@/lib/supabase/types';

/** Shown instead of an unhandled throw when the build has no Supabase keys. */
const NOT_CONFIGURED =
  'Supabase is not configured in this build — add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and rebuild.';

type Mode =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'edit'; vendor: VendorRow }
  | { kind: 'venue'; vendor: VendorRow };

const STATUS_STYLE: Record<VendorStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
};

const CATEGORY_LABEL: Record<string, string> = {
  venue: 'Venue',
  decor: 'Decor',
  photography: 'Photography',
  catering: 'Catering',
  makeup: 'Makeup',
  dj: 'DJ / Sound',
  other: 'Other',
};

export default function VendorPanel() {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | VendorStatus>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'list' });

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
      const [vendorsRes, citiesRes] = await Promise.all([
        supabase.from('vendors').select('*').order('created_at', { ascending: false }),
        supabase.from('cities').select('*').order('name', { ascending: true }),
      ]);
      if (vendorsRes.error) setError(vendorsRes.error.message);
      else setVendors((vendorsRes.data ?? []) as VendorRow[]);
      if (citiesRes.error) setError(citiesRes.error.message);
      else setCities((citiesRes.data ?? []) as CityRow[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Approval also moves the owner's account role (§13.2: only an admin may
   * change roles — this session is one). On reject, demote only if the owner
   * is currently a 'vendor' (never touch admins/customers).
   */
  const syncOwnerRole = async (ownerId: string, status: VendorStatus) => {
    if (!isSupabaseConfigured()) throw new Error(NOT_CONFIGURED);
    const supabase = getSupabaseBrowserClient();
    if (status === 'approved') {
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'vendor' })
        .eq('id', ownerId);
      if (roleError) {
        throw new Error(`Vendor saved, but the owner's role update failed: ${roleError.message}`);
      }
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', ownerId)
      .maybeSingle();
    if ((profile as { role?: string } | null)?.role === 'vendor') {
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'customer' })
        .eq('id', ownerId);
      if (roleError) {
        throw new Error(`Vendor saved, but the owner's role rollback failed: ${roleError.message}`);
      }
    }
  };

  const setVendorStatus = async (vendor: VendorRow, status: VendorStatus) => {
    setBusyId(vendor.id);
    setError(null);
    setNotice(null);
    if (!isSupabaseConfigured()) {
      setError(NOT_CONFIGURED);
      setBusyId(null);
      return;
    }
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from('vendors')
        .update({ status })
        .eq('id', vendor.id);
      if (updateError) throw new Error(updateError.message);
      if (vendor.owner_user_id) await syncOwnerRole(vendor.owner_user_id, status);
      setVendors((prev) => prev.map((row) => (row.id === vendor.id ? { ...row, status } : row)));
      setNotice(
        `${vendor.business_name} → ${status}` +
          (vendor.owner_user_id ? ` (owner role ${status === 'approved' ? 'vendor' : 'checked'})` : ''),
      );
    } catch (setStatusError) {
      setError(setStatusError instanceof Error ? setStatusError.message : String(setStatusError));
    }
    setBusyId(null);
  };

  const filtered =
    statusFilter === 'all' ? vendors : vendors.filter((vendor) => vendor.status === statusFilter);

  const counts = {
    pending: vendors.filter((vendor) => vendor.status === 'pending').length,
    approved: vendors.filter((vendor) => vendor.status === 'approved').length,
    rejected: vendors.filter((vendor) => vendor.status === 'rejected').length,
  };

  // ── forms ──────────────────────────────────────────────────────────────
  if (mode.kind === 'create') {
    return (
      <VendorForm
        vendor={null}
        cities={cities}
        onSaved={(row) => {
          setMode({ kind: 'edit', vendor: row });
          setNotice(`${row.business_name} created (status: ${row.status}).`);
          void load();
        }}
        onCancel={() => setMode({ kind: 'list' })}
      />
    );
  }
  if (mode.kind === 'edit') {
    return (
      <VendorForm
        key={mode.vendor.id}
        vendor={mode.vendor}
        cities={cities}
        onSaved={(row) => {
          setMode({ kind: 'edit', vendor: row });
          setNotice('Vendor saved.');
          void load();
        }}
        onCancel={() => setMode({ kind: 'list' })}
      />
    );
  }
  if (mode.kind === 'venue') {
    return (
      <VenueForm
        key={mode.vendor.id}
        vendor={mode.vendor}
        onSaved={() => {
          setNotice('Venue details saved.');
          setMode({ kind: 'list' });
          void load();
        }}
        onCancel={() => setMode({ kind: 'list' })}
      />
    );
  }

  // ── list / approval queue ──────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | VendorStatus)}
          className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#FF5B95]"
        >
          <option value="all">All statuses ({vendors.length})</option>
          <option value="pending">Pending ({counts.pending})</option>
          <option value="approved">Approved ({counts.approved})</option>
          <option value="rejected">Rejected ({counts.rejected})</option>
        </select>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setMode({ kind: 'create' })}
          className="rounded-xl bg-[#FF5B95] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-95 sm:ml-auto"
        >
          + Add vendor
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {notice && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          Loading vendors…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          {vendors.length === 0
            ? 'No vendors yet. Add the first one, or wait for vendor registrations.'
            : 'No vendors match this filter.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)]">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold">Category / city</th>
                <th className="px-4 py-3 font-semibold">Price range</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Account</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((vendor) => (
                <tr key={vendor.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{vendor.business_name}</div>
                    <div className="text-xs text-gray-400">{vendor.locality || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{CATEGORY_LABEL[vendor.category] ?? vendor.category}</div>
                    <div className="text-xs text-gray-400">{vendor.city}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {vendor.price_min != null && vendor.price_max != null
                      ? `₹${vendor.price_min.toLocaleString('en-IN')} – ₹${vendor.price_max.toLocaleString('en-IN')}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${STATUS_STYLE[vendor.status]}`}>
                      {vendor.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {vendor.owner_user_id ? 'linked account' : 'no account'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {vendor.status !== 'approved' && (
                        <button
                          type="button"
                          disabled={busyId === vendor.id}
                          onClick={() => void setVendorStatus(vendor, 'approved')}
                          className="rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}
                      {vendor.status !== 'rejected' && (
                        <button
                          type="button"
                          disabled={busyId === vendor.id}
                          onClick={() => void setVendorStatus(vendor, 'rejected')}
                          className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}
                      {vendor.category === 'venue' && (
                        <button
                          type="button"
                          onClick={() => setMode({ kind: 'venue', vendor })}
                          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                        >
                          Venue details
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setMode({ kind: 'edit', vendor })}
                        className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
