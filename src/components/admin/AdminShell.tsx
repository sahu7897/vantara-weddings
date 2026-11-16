import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface AdminNavItem { id: string; label: string; group: 'Workspace' | 'Website'; mark: string }

export default function AdminShell({ items, active, onSelect, children }: { items: AdminNavItem[]; active: string; onSelect: (id: string) => void; children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const filtered = useMemo(() => items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const groups = ['Workspace', 'Website'] as const;
  const navigate = (id: string) => { onSelect(id); setMobileOpen(false); };
  const logout = async () => { await fetch('/api/auth/admin/logout', { method: 'POST' }); window.location.assign('/admin/login'); };
  const nav = <>
    <div className="border-b border-[#eee4d4] px-5 py-6"><a href="/admin/dashboard" aria-label="Vantara Admin home"><Image src="/brand/vantara-monogram.svg" width={60} height={60} alt="Vantara Weddings" className="h-11 w-11" priority /></a><p className="mt-3 text-[10px] font-bold uppercase tracking-[.24em] text-[#9b8058]">VANTARA WEDDINGS</p><p className="mt-1 text-xs text-[#8b7d73]">Studio · Admin workspace</p></div>
    <div className="px-4 py-5"><label htmlFor="admin-nav-search" className="sr-only">Filter dashboard sections</label><input id="admin-nav-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a section…" className="w-full rounded-xl border border-[#eee4d4] bg-[#fffdf9] px-3 py-2.5 text-xs outline-none focus:border-[#a2794b] focus:ring-2 focus:ring-[#a2794b]/10" /></div>
    <nav aria-label="Admin sections" className="space-y-5 px-3">{groups.map((group) => { const groupItems = filtered.filter((item) => item.group === group); return groupItems.length ? <div key={group}><p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#a08f80]">{group}</p><div className="space-y-1">{groupItems.map((item) => <button type="button" key={item.id} onClick={() => navigate(item.id)} aria-current={active === item.id ? 'page' : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition ${active === item.id ? 'bg-[#7B0242] text-white shadow-md shadow-[#7B0242]/15' : 'text-[#66564c] hover:bg-[#f7f0e5] hover:text-[#7B0242]'}`}><span className="grid h-7 w-7 place-items-center rounded-lg bg-white/70 text-[11px] font-bold text-[#8a6a48]">{item.mark}</span>{item.label}</button>)}</div></div> : null; })}</nav>
    <div className="mt-auto p-4"><div className="rounded-2xl border border-[#eee4d4] bg-[#fffdf9] p-4"><p className="text-xs font-semibold text-[#57463b]">A considered experience</p><p className="mt-1 text-[11px] leading-5 text-[#918276]">Manage your wedding business with care and clarity.</p><a href="/" target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-bold text-[#7B0242] hover:underline">View public website ↗</a></div></div>
  </>;
  return <div className="min-h-screen bg-[#f8f5ef] text-[#33251e] lg:flex">
    <aside className="hidden w-[258px] shrink-0 flex-col border-r border-[#eae2d7] bg-[#fffefa] lg:sticky lg:top-0 lg:flex lg:h-screen">{nav}</aside>
    {mobileOpen && <div className="fixed inset-0 z-[70] bg-[#221815]/35 lg:hidden" onClick={() => setMobileOpen(false)}><aside onClick={(e) => e.stopPropagation()} className="flex h-full w-[min(84vw,300px)] flex-col overflow-y-auto bg-[#fffefa] shadow-2xl">{nav}</aside></div>}
    <div className="min-w-0 flex-1"><header className="sticky top-0 z-40 flex h-[68px] items-center justify-between border-b border-[#eae2d7] bg-[#fffefa]/95 px-4 backdrop-blur-xl sm:px-7 lg:px-10"><div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} type="button" aria-label="Open dashboard navigation" className="grid h-10 w-10 place-items-center rounded-xl border border-[#eee4d4] text-[#7B0242] lg:hidden"><span aria-hidden="true">☰</span></button><div><p className="text-[10px] font-bold uppercase tracking-[.19em] text-[#a18a70]">Admin workspace</p><p className="text-sm font-bold text-[#45352c]">Vantara Weddings</p></div></div><div className="flex items-center gap-3"><span className="hidden text-right sm:block"><span className="block text-xs font-bold text-[#514137]">Super Admin</span><span className="text-[10px] text-[#97897e]">Secure session</span></span><button onClick={() => void logout()} type="button" className="rounded-xl border border-[#e8ded1] px-3 py-2 text-xs font-bold text-[#735f50] transition hover:border-[#7B0242] hover:text-[#7B0242]">Sign out</button></div></header><main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8 lg:px-10">{children}</main></div>
  </div>;
}
