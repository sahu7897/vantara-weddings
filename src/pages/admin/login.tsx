import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { FormEvent, useState } from 'react';
import { site } from '@/config/site';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json() as { error?: string; redirect?: string };
      if (!response.ok) throw new Error(result.error || 'Sign in failed. Please try again.');
      const requested = typeof router.query.next === 'string' && router.query.next.startsWith('/admin/') && !router.query.next.startsWith('//') ? router.query.next : '';
      window.location.assign(requested || result.redirect || '/admin/dashboard');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign in failed. Please try again.');
    } finally { setBusy(false); }
  }

  return <>
    <Head><title>Admin sign in | {site.name}</title><meta name="robots" content="noindex,nofollow" /></Head>
    <main className="min-h-screen bg-[#fdf7e8] px-4 py-10 text-[#33251e] sm:grid sm:place-items-center">
      <div className="mx-auto w-full max-w-[440px]">
        <a href="/" className="mb-8 flex items-center justify-center" aria-label="Vantara Weddings home">
          <Image src="/brand/vantara-logo-header.svg" width={364} height={90} alt="Vantara Weddings" className="h-16 w-auto object-contain" priority />
        </a>
        <section className="overflow-hidden rounded-[28px] border border-[#e9dfca] bg-white shadow-[0_24px_80px_rgba(74,42,29,0.12)]">
          <div className="h-1.5 bg-gradient-to-r from-[#7B0242] via-[#a44e67] to-[#c39b5f]" />
          <div className="p-7 sm:p-10">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.24em] text-[#9a7c55]">Private access</p>
            <h1 className="mt-3 text-center font-playfair text-3xl font-semibold text-[#7B0242]">Admin sign in</h1>
            <p className="mt-2 text-center text-sm leading-6 text-[#82766e]">Sign in to manage Vantara Weddings.</p>
            <form className="mt-8 space-y-5" onSubmit={submit}>
              <label className="block text-sm font-semibold text-[#4e3d34]">Username
                <input autoComplete="username" required minLength={8} maxLength={48} value={username} onChange={(e) => setUsername(e.target.value)} className="mt-2 w-full rounded-xl border border-[#e7dfd5] bg-[#fffdf9] px-4 py-3 text-sm outline-none transition placeholder:text-[#b7aaa0] focus:border-[#7B0242] focus:ring-4 focus:ring-[#7B0242]/10" placeholder="Your admin username" />
              </label>
              <label className="block text-sm font-semibold text-[#4e3d34]">Password
                <input type="password" autoComplete="current-password" required minLength={16} maxLength={256} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-[#e7dfd5] bg-[#fffdf9] px-4 py-3 text-sm outline-none transition placeholder:text-[#b7aaa0] focus:border-[#7B0242] focus:ring-4 focus:ring-[#7B0242]/10" placeholder="Enter your password" />
              </label>
              {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              {router.query.reason === 'unconfigured' && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Admin sign-in needs server configuration. Please contact the site owner.</p>}
              {router.query.reason === 'reauth' && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Please sign in again to continue to the admin workspace.</p>}
              <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#7B0242] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#7B0242]/15 transition hover:bg-[#600233] focus:outline-none focus:ring-4 focus:ring-[#7B0242]/20 disabled:cursor-wait disabled:opacity-60">{busy ? 'Securing your session…' : 'Sign in securely'}</button>
            </form>
            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#9a8e84]"><span aria-hidden="true">✦</span> Secure, private administrator access</div>
          </div>
        </section>
        <p className="mt-6 text-center text-xs text-[#96897e]">© {new Date().getFullYear()} {site.name}</p>
      </div>
    </main>
  </>;
}
