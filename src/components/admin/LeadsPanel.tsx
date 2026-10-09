/**
 * Admin → Leads (Phase 5 §13.7): the leads list with filters, status changes
 * and vendor assignment. Everything runs through the signed-in admin's own
 * session — RLS (migration 0002) is what grants admin access; no service key
 * in the browser. Status/assignment guards live server-side (guard triggers),
 * so any non-admin session would fail honestly rather than corrupt data.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { LeadRow, LeadStatus, VendorRow } from '@/lib/supabase/types';

export const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'booked', 'lost'];

/** Shown instead of an unhandled throw when the build has no Supabase keys. */
const NOT_CONFIGURED =
  'Supabase is not configured in this build — add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and rebuild.';

const STATUS_STYLE: Record<LeadStatus, string> = {
  new: 'bg-pink-100 text-[#7B0242]',
  contacted: 'bg-blue-100 text-blue-800',
  qualified: 'bg-amber-100 text-amber-800',
  booked: 'bg-green-100 text-green-800',
  lost: 'bg-gray-200 text-gray-600',
};

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  booked: 'Booked',
  lost: 'Lost',
};

export default function LeadsPanel() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

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
      const [leadsRes, vendorsRes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('vendors').select('*').order('business_name', { ascending: true }),
      ]);
      if (leadsRes.error) setError(leadsRes.error.message);
      else setLeads((leadsRes.data ?? []) as LeadRow[]);
      if (vendorsRes.error) setError(vendorsRes.error.message);
      else setVendors((vendorsRes.data ?? []) as VendorRow[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
      if (!q) return true;
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.phone.includes(q) ||
        (lead.city ?? '').toLowerCase().includes(q)
      );
    });
  }, [leads, statusFilter, query]);

  const vendorName = (id: string | null): string => {
    if (!id) return '—';
    return vendors.find((v) => v.id === id)?.business_name ?? 'Unknown vendor';
  };

  const updateLead = async (lead: LeadRow, patch: Partial<Pick<LeadRow, 'status' | 'assigned_vendor_id'>>) => {
    setBusyId(lead.id);
    setError(null);
    setNotice(null);
    if (!isSupabaseConfigured()) {
      setError(NOT_CONFIGURED);
      setBusyId(null);
      return;
    }
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.from('leads').update(patch).eq('id', lead.id);
      if (updateError) {
        setError(updateError.message);
      } else {
        setLeads((prev) => prev.map((row) => (row.id === lead.id ? { ...row, ...patch } : row)));
        setNotice(`Saved — ${lead.name}`);
      }
    } catch (updateFailure) {
      setError(updateFailure instanceof Error ? updateFailure.message : String(updateFailure));
    }
    setBusyId(null);
  };

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone or city…"
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#FF5B95] sm:w-72"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | LeadStatus)}
          className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#FF5B95]"
        >
          <option value="all">All statuses</option>
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          Refresh
        </button>
        <span className="text-xs text-gray-400 sm:ml-auto">
          {filtered.length} of {leads.length} shown (latest 200)
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          Loading leads…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          {leads.length === 0
            ? 'No leads yet. Enquiry forms go live in Stage 4 and start writing here.'
            : 'No leads match this filter.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)]">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 font-semibold">Lead</th>
                <th className="px-4 py-3 font-semibold">City / date</th>
                <th className="px-4 py-3 font-semibold">Services</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Assigned vendor</th>
                <th className="px-4 py-3 font-semibold">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((lead) => (
                <tr key={lead.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{lead.name}</div>
                    <a href={`tel:${lead.phone}`} className="text-xs text-[#7B0242]">
                      {lead.phone}
                    </a>
                    {lead.budget_range && (
                      <div className="text-xs text-gray-400">Budget: {lead.budget_range}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{lead.city ?? '—'}</div>
                    <div className="text-xs text-gray-400">
                      {lead.event_date
                        ? new Date(lead.event_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Date not set'}
                      {lead.guest_count ? ` · ${lead.guest_count} guests` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {Array.isArray(lead.services_needed) && lead.services_needed.length > 0
                      ? lead.services_needed.join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      disabled={busyId === lead.id}
                      onChange={(e) => void updateLead(lead, { status: e.target.value as LeadStatus })}
                      className={`rounded-lg border-0 px-2 py-1.5 text-xs font-semibold ${
                        STATUS_STYLE[lead.status]
                      } ${busyId === lead.id ? 'opacity-50' : ''}`}
                    >
                      {LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABEL[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.assigned_vendor_id ?? ''}
                      disabled={busyId === lead.id}
                      onChange={(e) =>
                        void updateLead(lead, { assigned_vendor_id: e.target.value || null })
                      }
                      className="w-48 rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-[#FF5B95]"
                    >
                      <option value="">— unassigned —</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.business_name}
                          {vendor.status !== 'approved' ? ` (${vendor.status})` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 text-[11px] text-gray-400">{vendorName(lead.assigned_vendor_id)}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(lead.created_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {lead.source_page && <div className="mt-0.5">via {lead.source_page}</div>}
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
