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
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { InferGetServerSidePropsType } from 'next';
import { site } from '@/config/site';
import AdminShell, { type AdminNavItem } from '@/components/admin/AdminShell';
import AdminOverview from '@/components/admin/AdminOverview';
import BookingsPanel from '@/components/admin/BookingsPanel';
import LeadsPanel from '@/components/admin/LeadsPanel';
import VendorPanel from '@/components/admin/VendorPanel';
import SiteSettingsPanel from '@/components/admin/cms/SiteSettingsPanel';
import HeroSectionPanel from '@/components/admin/cms/HeroSectionPanel';
import FaqSectionPanel from '@/components/admin/cms/FaqSectionPanel';
import PagesManagerPanel from '@/components/admin/cms/PagesManagerPanel';
import MediaLibraryPanel from '@/components/admin/cms/MediaLibraryPanel';
import { requireAuth } from '@/lib/auth/gssp';

export const getServerSideProps = requireAuth({ path: '/admin/dashboard', roles: ['admin'] });
type Tab = 'overview' | 'leads' | 'vendors' | 'bookings' | 'site_settings' | 'hero_section' | 'faqs_section' | 'pages_manager' | 'media_library';
const TABS: AdminNavItem[] = [
  { id: 'overview', label: 'Overview', group: 'Workspace', mark: 'OV' },
  { id: 'leads', label: 'Enquiries', group: 'Workspace', mark: 'LE' },
  { id: 'vendors', label: 'Vendor partners', group: 'Workspace', mark: 'VP' },
  { id: 'bookings', label: 'Bookings', group: 'Workspace', mark: 'BK' },
  { id: 'site_settings', label: 'Site settings', group: 'Website', mark: 'ST' },
  { id: 'hero_section', label: 'Hero videos', group: 'Website', mark: 'HV' },
  { id: 'faqs_section', label: 'FAQs', group: 'Website', mark: 'FAQ' },
  { id: 'pages_manager', label: 'Pages', group: 'Website', mark: 'PG' },
  { id: 'media_library', label: 'Media library', group: 'Website', mark: 'ML' },
];

export default function AdminDashboardPage({ configured }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const selectTab = (next: string) => {
    if (!TABS.some((item) => item.id === next)) return;
    setTab(next as Tab);
    void router.replace({ pathname: router.pathname, query: next === 'overview' ? {} : { tab: next } }, undefined, { shallow: true });
  };
  useEffect(() => {
    if (!router.isReady) return;
    const requested = typeof router.query.tab === 'string' ? router.query.tab : '';
    if (TABS.some((item) => item.id === requested)) setTab(requested as Tab);
  }, [router.isReady, router.query.tab]);

  return <>
    <Head><title>Admin workspace | {site.name}</title><meta name="robots" content="noindex,nofollow" /></Head>
    <AdminShell items={TABS} active={tab} onSelect={selectTab}>
      {!configured ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Supabase is not configured for this environment. Dashboard data remains protected until server configuration is available.</div> : <>
        {tab === 'overview' && <AdminOverview onNavigate={selectTab} />}
        {tab === 'leads' && <LeadsPanel />}
        {tab === 'vendors' && <VendorPanel />}
        {tab === 'bookings' && <BookingsPanel />}
        {tab === 'site_settings' && <SiteSettingsPanel />}
        {tab === 'hero_section' && <HeroSectionPanel />}
        {tab === 'faqs_section' && <FaqSectionPanel />}
        {tab === 'pages_manager' && <PagesManagerPanel />}
        {tab === 'media_library' && <MediaLibraryPanel />}
      </>}
    </AdminShell>
  </>;
}
