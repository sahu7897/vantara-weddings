/**
 * OAuth / magic-link return path (Phase 5 §13.2).
 *
 * Handles:
 *  - ?code=...            PKCE exchange (Google OAuth, email OTP/magic links)
 *  - ?token_hash=...      template links that use {{ .TokenHash }}, with the
 *                         matching GoTrue token type in ?type= (default
 *                         'email'; e.g. 'magiclink' for admin-minted links)
 *  - ?error_code=...      Supabase Auth error redirects (expired/invalid links)
 *
 * On success the visitor is sent to ?next= (same-site only) or their
 * role-based home via a full navigation so middleware validates the session.
 */
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import type { EmailOtpType, User } from '@supabase/supabase-js';
import { site } from '@/config/site';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import { DEFAULT_ROLE, ROLE_HOME, getRole, safeNext } from '@/lib/auth/roles';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setError(
            'Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example).',
          );
        }
        return;
      }
      try {
        const supabase = getSupabaseBrowserClient();
        const code = typeof router.query.code === 'string' ? router.query.code : null;
        const tokenHash = typeof router.query.token_hash === 'string' ? router.query.token_hash : null;

        let signedUser: User | null = null;
        if (tokenHash) {
          const rawType = typeof router.query.type === 'string' ? router.query.type : 'email';
          const otpType: EmailOtpType = [
            'email',
            'magiclink',
            'recovery',
            'invite',
            'signup',
            'email_change',
          ].includes(rawType)
            ? rawType
            : 'email';
          const { data, error: err } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });
          if (err) throw err;
          signedUser = data.user;
        } else if (code) {
          const { data, error: err } = await supabase.auth.exchangeCodeForSession(code);
          if (err) throw err;
          signedUser = data.user;
        } else {
          const description =
            (typeof router.query.error_description === 'string' && router.query.error_description) ||
            (typeof router.query.error_code === 'string' && router.query.error_code) ||
            (typeof router.query.error === 'string' && router.query.error) ||
            null;
          throw new Error(description ?? 'This sign-in link is invalid or has expired.');
        }

        const role =
          (signedUser ? await getRole(supabase, signedUser.id) : null) ?? DEFAULT_ROLE;
        const target = safeNext(router.query.next) ?? ROLE_HOME[role];
        if (!cancelled) window.location.assign(target);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Sign-in failed.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query]);

  return (
    <>
      <Head>
        <title>{`Signing in | ${site.name}`}</title>
      </Head>
      <SiteHeader variant="sticky" />
      <section className="mx-auto max-w-md px-4 py-14 sm:px-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)] sm:p-8">
          {error ? (
            <>
              <h1 className="text-xl font-extrabold text-[#7B0242]">Sign-in failed</h1>
              <p className="mt-3 text-sm text-red-600">{error}</p>
              <a
                href="/login"
                className="mt-6 inline-block rounded-xl bg-[#FF5B95] px-5 py-3 font-bold text-white"
              >
                Back to sign in
              </a>
            </>
          ) : (
            <>
              <h1 className="text-xl font-extrabold text-[#7B0242]">Signing you in…</h1>
              <p className="mt-3 text-sm text-gray-500">Hang tight — this only takes a moment.</p>
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
