/**
 * /admin/dashboard — the admin panel (Phase 5 §13.7). Server-side guarded by
 * requireAuth (role admin only); panels fetch through the admin's own session
 * so RLS (0002) is the access control — the service role key never reaches
 * the browser. Tabs remount on switch, so each opens on fresh data.
 *
 * Stage 3 scope: leads (filters/status/assignment), vendor approval queue +
 * vendor/venue forms with image upload (§13.5 validation), bookings +
 * commission summary.
 */
import Head from 'next/head';
import { useState } from 'react';
import type { InferGetServerSidePropsType } from 'next';
import { site } from '@/config/site';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import BookingsPanel from '@/components/admin/BookingsPanel';
import LeadsPanel from '@/components/admin/LeadsPanel';
import VendorPanel from '@/components/admin/VendorPanel';
import SiteSettingsPanel from '@/components/admin/cms/SiteSettingsPanel';
import HeroSectionPanel from '@/components/admin/cms/HeroSectionPanel';
import FaqSectionPanel from '@/components/admin/cms/FaqSectionPanel';
import PagesManagerPanel from '@/components/admin/cms/PagesManagerPanel';
import MediaLibraryPanel from '@/components/admin/cms/MediaLibraryPanel';
import { requireAuth } from '@/lib/auth/gssp';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

export const getServerSideProps = requireAuth({
  path: '/admin/dashboard',
  roles: ['admin'],
});

type Tab =
  | 'leads'
  | 'vendors'
  | 'bookings'
  | 'site_settings'
  | 'hero_section'
  | 'faqs_section'
  | 'pages_manager'
  | 'media_library';

const TABS: { id: Tab; label: string; group?: 'crm' | 'cms' }[] = [
  { id: 'leads', label: 'Leads' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'site_settings', label: '⚙️ Site Settings' },
  { id: 'hero_section', label: '🎬 Hero Videos' },
  { id: 'faqs_section', label: '❓ FAQs' },
  { id: 'pages_manager', label: '📄 Pages' },
  { id: 'media_library', label: '🖼️ Media' },
];

export default function AdminDashboardPage({
  configured,
  email,
  phone,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [tab, setTab] = useState<Tab>('leads');

  const handleSignOut = async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.assign('/login');
  };

  return (
    <>
      <Head>
        <title>{`Admin dashboard | ${site.name}`}</title>
      </Head>
      <SiteHeader variant="sticky" />

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Admin dashboard</h1>
          <p className="text-sm text-gray-500">
            Signed in as <span className="font-semibold text-gray-700">{email || phone}</span>
          </p>
        </div>

        {!configured ? (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            Supabase isn&apos;t configured in this build — add the keys from{' '}
            <code className="font-mono">.env.example</code> to <code className="font-mono">.env.local</code> and
            rebuild.
          </div>
        ) : (
          <>
            {/* tab bar */}
            <nav className="mt-6 flex gap-2 border-b border-gray-100 pb-px" aria-label="Admin sections">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-current={tab === item.id ? 'page' : undefined}
                  className={`rounded-t-xl px-5 py-2.5 text-sm font-bold transition ${
                    tab === item.id
                      ? 'bg-[#7B0242] text-white'
                      : 'text-gray-500 hover:bg-pink-50 hover:text-[#7B0242]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="mt-6">
              {tab === 'leads' && <LeadsPanel />}
              {tab === 'vendors' && <VendorPanel />}
              {tab === 'bookings' && <BookingsPanel />}
              {tab === 'site_settings' && <SiteSettingsPanel />}
              {tab === 'hero_section' && <HeroSectionPanel />}
              {tab === 'faqs_section' && <FaqSectionPanel />}
              {tab === 'pages_manager' && <PagesManagerPanel />}
              {tab === 'media_library' && <MediaLibraryPanel />}
            </div>

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
