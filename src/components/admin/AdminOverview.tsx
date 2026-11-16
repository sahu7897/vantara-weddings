import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface Metrics { leads: number; fresh: number; vendors: number; pending: number; bookings: number; confirmed: number }
export default function AdminOverview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [data, setData] = useState<Metrics | null>(null); const [busy, setBusy] = useState(true); const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured()) { setError('Supabase is not configured; live metrics are unavailable.'); setBusy(false); return; }
      try {
        const db = getSupabaseBrowserClient();
        const [leads, fresh, vendors, pending, bookings, confirmed] = await Promise.all([
          db.from('leads').select('*', { count: 'exact', head: true }), db.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
          db.from('vendors').select('*', { count: 'exact', head: true }), db.from('vendors').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          db.from('bookings').select('*', { count: 'exact', head: true }), db.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
        ]);
        const failure = [leads.error, fresh.error, vendors.error, pending.error, bookings.error, confirmed.error].find(Boolean);
        if (failure) throw new Error(failure.message);
        if (active) setData({ leads: leads.count ?? 0, fresh: fresh.count ?? 0, vendors: vendors.count ?? 0, pending: pending.count ?? 0, bookings: bookings.count ?? 0, confirmed: confirmed.count ?? 0 });
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Could not load live metrics.'); }
      finally { if (active) setBusy(false); }
    }
    void load(); return () => { active = false; };
  }, []);
  const cards = data ? [
    { name: 'Total enquiries', n: data.leads, detail: `${data.fresh} new to review`, tab: 'leads', icon: 'LEAD' },
    { name: 'Vendor partners', n: data.vendors, detail: `${data.pending} applications pending`, tab: 'vendors', icon: 'VEND' },
    { name: 'Bookings', n: data.bookings, detail: `${data.confirmed} confirmed`, tab: 'bookings', icon: 'BOOK' },
  ] : [];
  const actions = [['Review new enquiries', 'Follow up with couples and manage lead progress.', 'leads'], ['Review partner applications', 'Keep your vendor network up to date.', 'vendors'], ['Track bookings', 'View event dates and commission records.', 'bookings'], ['Edit your website', 'Manage branding, pages, content and media.', 'site_settings']];
  return <div className="space-y-7">
    <section className="rounded-[26px] border border-[#ece2d3] bg-[radial-gradient(ellipse_at_top_right,rgba(195,155,95,.22),transparent_40%),linear-gradient(125deg,#fffefa,#f7f0e5)] p-6 sm:p-9"><p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#a07d52]">Your business, beautifully organized</p><h1 className="mt-3 font-playfair text-3xl font-semibold text-[#7B0242] sm:text-4xl">Welcome to your studio</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#76685e]">A clear view of enquiries, partners, bookings and your website experience.</p></section>
    {error && <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">{error}</div>}
    <section aria-label="Live business overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{busy ? [1,2,3].map((n) => <div key={n} className="h-36 animate-pulse rounded-2xl border border-[#eee5d8] bg-white" />) : cards.map((card, i) => <button key={card.name} type="button" onClick={() => onNavigate(card.tab)} className="group rounded-2xl border border-[#eee5d8] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-start justify-between"><span className="text-xs font-semibold text-[#8f8175]">{card.name}</span><span className={`grid h-10 w-10 place-items-center rounded-xl text-[9px] font-extrabold text-white ${i === 0 ? 'bg-[#7B0242]' : i === 1 ? 'bg-[#a27c4a]' : 'bg-[#756184]'}`}>{card.icon}</span></div><p className="mt-4 text-3xl font-semibold text-[#3b2c24]">{card.n.toLocaleString('en-IN')}</p><div className="mt-2 flex justify-between"><span className="text-xs text-[#94867b]">{card.detail}</span><span className="text-[#7B0242] group-hover:translate-x-1" aria-hidden="true">→</span></div></button>)}</section>
    <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]"><section className="rounded-2xl border border-[#eee5d8] bg-white p-5 sm:p-7"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a08d79]">Workspace</p><h2 className="mt-1 text-lg font-bold text-[#4b392f]">Continue where you left off</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{actions.map(([title,note,tab]) => <button type="button" key={title} onClick={() => onNavigate(tab)} className="rounded-xl border border-[#f0e9df] bg-[#fffefa] p-4 text-left transition hover:border-[#d9c6aa] hover:bg-[#fcf7ef]"><p className="text-sm font-bold text-[#553f33]">{title}<span className="float-right text-[#98734a]">↗</span></p><p className="mt-1.5 text-xs leading-5 text-[#918276]">{note}</p></button>)}</div></section>
      <aside className="rounded-2xl bg-[#7B0242] p-6 text-white shadow-lg"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-white/60">Studio pulse</p><h2 className="mt-2 font-playfair text-2xl">Thoughtful details,<br/>seamless celebrations.</h2><p className="mt-3 text-xs leading-6 text-white/75">Dashboard metrics reflect live records. No placeholder totals or sample activity are shown.</p><div className="mt-6 border-t border-white/15 pt-4"><p className="text-xs text-white/65">Bookings currently recorded</p><p className="mt-1 text-2xl font-semibold">{busy ? '—' : data?.bookings ?? '—'}</p></div></aside></div>
  </div>;
}
