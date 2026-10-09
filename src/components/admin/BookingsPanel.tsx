/**
 * Admin → Bookings & commission summary (Phase 5 §13.7). Read-only: bookings
 * are created once the vendor network starts converting leads (Stage 5+);
 * until then this shows an honest empty state rather than fake numbers.
 */
import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { BookingRow, BookingStatus } from '@/lib/supabase/types';

/** Shown instead of an unhandled throw when the build has no Supabase keys. */
const NOT_CONFIGURED =
  'Supabase is not configured in this build — add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and rebuild.';

interface BookingListRow extends BookingRow {
  vendors: { business_name: string } | null;
  leads: { name: string; phone: string } | null;
}

const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-200 text-gray-600',
};

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export default function BookingsPanel() {
  const [bookings, setBookings] = useState<BookingListRow[]>([]);
  const [loading, setLoading] = useState(true);
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
        .from('bookings')
        .select('*, vendors(business_name), leads(name, phone)')
        .order('event_date', { ascending: false })
        .limit(200);
      if (loadError) setError(loadError.message);
      else setBookings((data ?? []) as BookingListRow[]);
    } catch (loadFailure) {
      setError(loadFailure instanceof Error ? loadFailure.message : String(loadFailure));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const gross = bookings.reduce((sum, booking) => sum + Number(booking.amount || 0), 0);
  const commission = bookings.reduce((sum, booking) => sum + Number(booking.commission_amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          Refresh
        </button>
        <span className="text-xs text-gray-400">Latest 200 bookings</span>
      </div>

      {/* commission summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)]">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Bookings</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-800">{bookings.length}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)]">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Gross value</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-800">{inr.format(gross)}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)]">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Commission</div>
          <div className="mt-1 text-2xl font-extrabold text-[#FF5B95]">{inr.format(commission)}</div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          Loading bookings…
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          No bookings yet. Bookings are recorded here — with their commission — as leads convert once
          the vendor network goes live (Stage 5).
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold">Lead</th>
                <th className="px-4 py-3 font-semibold">Event date</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Commission</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {booking.vendors?.business_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {booking.leads?.name ?? '—'}
                    {booking.leads?.phone && (
                      <div className="text-xs text-gray-400">{booking.leads.phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(booking.event_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{inr.format(Number(booking.amount))}</td>
                  <td className="px-4 py-3 text-[#7B0242]">
                    {inr.format(Number(booking.commission_amount))}
                    <span className="ml-1 text-xs text-gray-400">
                      ({Number(booking.commission_percent)}%)
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${STATUS_STYLE[booking.status]}`}>
                      {booking.status}
                    </span>
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
