/**
 * /account — customer home (Phase 5 §13.2, §13.7): "my enquiries and their
 * status". Server-side protected via getServerSideProps, and the enquiries are
 * loaded server-side through the customer's own session so RLS (0002) is the
 * access control — the browser never needs a broad query.
 *
 * This page used to promise enquiries "once enquiry forms go live (Stage 4)"
 * even though LeadForm has been writing to `leads` (with `customer_id` linked
 * for signed-in users) since Stage 4 — so the copy was stale and the list was
 * always empty. It now shows the real rows, with an honest empty state.
 */
import Head from 'next/head';
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { site } from '@/config/site';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import { ROLE_LABEL } from '@/lib/auth/roles';
import { requireAuth } from '@/lib/auth/gssp';
import { createGsspSupabase, isSupabaseConfiguredServer } from '@/lib/supabase/server';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { LeadRow, LeadStatus } from '@/lib/supabase/types';

export interface AccountEnquiry {
  id: string;
  createdAt: string;
  status: LeadStatus;
  city: string | null;
  eventDate: string | null;
  budgetRange: string | null;
  guestCount: number | null;
  servicesNeeded: string[] | null;
  sourcePage: string | null;
  vendorName: string | null;
}

interface AccountProps {
  configured: boolean;
  role: 'customer' | 'vendor' | 'admin';
  phone: string;
  email: string;
  memberSince: string | null;
  enquiries: AccountEnquiry[];
}

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'Received',
  contacted: 'Contacted',
  qualified: 'Qualified',
  booked: 'Booked',
  lost: 'Closed',
};

const STATUS_STYLE: Record<LeadStatus, string> = {
  new: 'bg-pink-100 text-[#7B0242]',
  contacted: 'bg-blue-100 text-blue-800',
  qualified: 'bg-amber-100 text-amber-800',
  booked: 'bg-green-100 text-green-800',
  lost: 'bg-gray-200 text-gray-600',
};

const baseGuard = requireAuth({ path: '/account' });

export const getServerSideProps: GetServerSideProps<AccountProps> = async (ctx) => {
  const guarded = await baseGuard(ctx);
  // requireAuth returns { props } when authorised, or a { redirect } result.
  if (!('props' in guarded)) return guarded;

  const authProps = (await guarded.props) as Omit<AccountProps, 'enquiries'>;
  if (!authProps.configured || !isSupabaseConfiguredServer()) {
    return { props: { ...authProps, enquiries: [] } };
  }

  try {
    const supabase = createGsspSupabase(ctx);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { props: { ...authProps, enquiries: [] } };

    const { data } = await supabase
      .from('leads')
      .select('*, vendors ( business_name )')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const rows = (data ?? []) as (LeadRow & { vendors?: { business_name?: string } | null })[];
    const enquiries: AccountEnquiry[] = rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      status: row.status,
      city: row.city,
      eventDate: row.event_date,
      budgetRange: row.budget_range,
      guestCount: row.guest_count,
      servicesNeeded: row.services_needed,
      sourcePage: row.source_page,
      vendorName: row.vendors?.business_name ?? null,
    }));

    return { props: { ...authProps, enquiries } };
  } catch {
    // Never break the page on a data hiccup — show the empty state instead.
    return { props: { ...authProps, enquiries: [] } };
  }
};

export default function AccountPage({
  configured,
  role,
  phone,
  email,
  memberSince,
  enquiries,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const handleSignOut = async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.assign('/login');
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <>
      <Head>
        <title>{`My account | ${site.name}`}</title>
      </Head>
      <SiteHeader variant="sticky" />

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">My account</h1>

        {!configured ? (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            Supabase isn&apos;t configured in this build — add the keys from{' '}
            <code className="font-mono">.env.example</code> to <code className="font-mono">.env.local</code> and
            rebuild.
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)]">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-400">Signed in as</dt>
                  <dd className="font-semibold text-gray-800">{email || phone || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Role</dt>
                  <dd className="font-semibold text-gray-800">{ROLE_LABEL[role]}</dd>
                </div>
                {memberSince && (
                  <div>
                    <dt className="text-gray-400">Member since</dt>
                    <dd className="font-semibold text-gray-800">{formatDate(memberSince)}</dd>
                  </div>
                )}
              </dl>
            </div>

            <h2 className="mt-10 text-xl font-bold text-[#7B0242]">My enquiries</h2>

            {enquiries.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <p className="text-sm text-gray-500">
                  No enquiries yet. Everything you send through a venue, decorator or photographer
                  enquiry form appears here with its current status.
                </p>
              </div>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {enquiries.map((enquiry) => (
                  <li
                    key={enquiry.id}
                    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-gray-800">
                        {enquiry.vendorName || enquiry.city || 'Wedding enquiry'}
                      </p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[enquiry.status]}`}
                      >
                        {STATUS_LABEL[enquiry.status]}
                      </span>
                    </div>
                    <dl className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
                      <div>
                        <dt className="inline text-gray-400">Sent: </dt>
                        <dd className="inline">{formatDate(enquiry.createdAt)}</dd>
                      </div>
                      {enquiry.eventDate && (
                        <div>
                          <dt className="inline text-gray-400">Event date: </dt>
                          <dd className="inline">{formatDate(enquiry.eventDate)}</dd>
                        </div>
                      )}
                      {enquiry.city && (
                        <div>
                          <dt className="inline text-gray-400">City: </dt>
                          <dd className="inline">{enquiry.city}</dd>
                        </div>
                      )}
                      {enquiry.budgetRange && (
                        <div>
                          <dt className="inline text-gray-400">Budget: </dt>
                          <dd className="inline">{enquiry.budgetRange}</dd>
                        </div>
                      )}
                      {enquiry.guestCount ? (
                        <div>
                          <dt className="inline text-gray-400">Guests: </dt>
                          <dd className="inline">{enquiry.guestCount}</dd>
                        </div>
                      ) : null}
                    </dl>
                    {enquiry.servicesNeeded && enquiry.servicesNeeded.length > 0 && (
                      <p className="mt-3 flex flex-wrap gap-1.5">
                        {enquiry.servicesNeeded.map((service) => (
                          <span
                            key={service}
                            className="rounded-full bg-pink-50 px-2.5 py-1 text-xs text-[#7B0242]"
                          >
                            {service}
                          </span>
                        ))}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              className="mt-8 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
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
