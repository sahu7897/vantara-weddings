/**
 * Sign-in page (Phase 5 §13.2) — phone + OTP primary, email magic link and
 * Google secondary. Sessions live in httpOnly cookies (@supabase/ssr); after
 * verification we do a full navigation so middleware sees the fresh cookies.
 *
 * OTP safety: Supabase enforces resend cooldown (60 s), expiry and per-phone /
 * per-IP rate limits server-side (configured in the dashboard, README Stage 6);
 * this page adds the client-side resend cooldown + input validation.
 */
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { site } from '@/config/site';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import { DEFAULT_ROLE, ROLE_HOME, getRole, safeNext } from '@/lib/auth/roles';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

type Step = 'phone' | 'otp' | 'email-sent';

const RESEND_COOLDOWN_S = 60;
/** Survives a page reload so a fresh tab cannot immediately re-fire an email. */
const COOLDOWN_KEY = 'vantara.auth.cooldownUntil';
const DEFAULT_RATE_LIMIT_S = 60;

/**
 * GoTrue rejects sends with `over_email_send_rate_limit` (429) once Supabase's
 * built-in email sender quota is spent — the default sender is heavily
 * throttled, so this is easy to hit. Say what to do instead of surfacing the
 * bare "email rate limit exceeded".
 */
function describeAuthError(err: unknown, channel: 'email' | 'phone'): { limited: boolean; seconds: number; message: string } {
  const anyErr = err as { code?: string; status?: number; message?: string } | null;
  const raw = anyErr?.message ?? String(err ?? 'Something went wrong.');
  const limited =
    anyErr?.status === 429 ||
    anyErr?.code === 'over_email_send_rate_limit' ||
    anyErr?.code === 'over_sms_send_rate_limit' ||
    /rate limit/i.test(raw);
  if (!limited) return { limited: false, seconds: 0, message: raw };
  const who = channel === 'email' ? 'confirmation emails' : 'SMS messages';
  return {
    limited: true,
    seconds: DEFAULT_RATE_LIMIT_S,
    message:
      `Too many ${who} requested — Supabase's built-in sender is rate limited and resets shortly. ` +
      'Wait about a minute, use another sign-in method, or connect your own SMTP provider in ' +
      'Supabase → Authentication → Emails to remove the limit.',
  };
}

function readCooldown(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const until = Number(window.localStorage.getItem(COOLDOWN_KEY) ?? 0);
    return until > Date.now() ? Math.ceil((until - Date.now()) / 1000) : 0;
  } catch {
    return 0;
  }
}

function writeCooldown(seconds: number): void {
  if (typeof window === 'undefined') return;
  try {
    if (seconds <= 0) window.localStorage.removeItem(COOLDOWN_KEY);
    else window.localStorage.setItem(COOLDOWN_KEY, String(Date.now() + seconds * 1000));
  } catch {
    /* storage unavailable — the in-memory cooldown still applies */
  }
}

function authCallbackUrl(next: unknown): string {
  const base =
    typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL ?? '');
  const target = safeNext(next);
  return `${base}/auth/callback${target ? `?next=${encodeURIComponent(target)}` : ''}`;
}

export default function LoginPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();

  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const next = safeNext(router.query.next);

  const finish = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    const signedInUser = userData.user;
    const role = (signedInUser ? await getRole(supabase, signedInUser.id) : null) ?? DEFAULT_ROLE;
    // Full navigation → middleware validates the new session server-side.
    window.location.assign(next ?? ROLE_HOME[role]);
  }, [next]);

  // Already signed in? Leave immediately (role decides the destination).
  useEffect(() => {
    if (!router.isReady || !configured) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled && user) await finish();
      } catch {
        /* handled by the configured banner */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, configured, finish]);

  // Restore a cooldown persisted by an earlier page load (once), so a refresh
  // cannot be used to bypass the wait and immediately hit the rate limit again.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const remaining = readCooldown();
    if (remaining > 0) setCooldown(remaining);
  }, []);

  // Resend cooldown ticker — clears the stored deadline once it elapses.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          writeCooldown(0);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const sendOtp = async () => {
    setError(null);
    if (!/^\d{10}$/.test(phone)) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: err } = await supabase.auth.signInWithOtp({ phone: `+91${phone}` });
      if (err) throw err;
      setStep('otp');
      setCooldown(RESEND_COOLDOWN_S);
      writeCooldown(RESEND_COOLDOWN_S);
      toast.success('OTP sent to your phone');
    } catch (err) {
      const info = describeAuthError(err, 'phone');
      setError(info.message);
      if (info.limited) {
        setCooldown(info.seconds);
        writeCooldown(info.seconds);
      }
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: err } = await supabase.auth.verifyOtp({
        phone: `+91${phone}`,
        token: otp,
        type: 'sms',
      });
      if (err) throw err;
      await finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please try again.');
      setBusy(false);
    }
  };

  const sendMagicLink = async () => {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: authCallbackUrl(next) },
      });
      if (err) throw err;
      setStep('email-sent');
      setCooldown(RESEND_COOLDOWN_S);
      writeCooldown(RESEND_COOLDOWN_S);
      toast.success('Magic link sent — check your inbox');
    } catch (err) {
      const info = describeAuthError(err, 'email');
      setError(info.message);
      if (info.limited) {
        setCooldown(info.seconds);
        writeCooldown(info.seconds);
      }
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: authCallbackUrl(next) },
      });
      if (err) throw err;
      // Browser navigates away to the Google consent screen.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      setBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none transition focus:border-[#FF5B95] focus:ring-2 focus:ring-[#FF5B95]/30';
  const primaryButtonClass =
    'w-full rounded-xl bg-[#FF5B95] px-4 py-3 font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <>
      <Head>
        <title>{`Sign in | ${site.name}`}</title>
      </Head>
      <SiteHeader variant="sticky" />
      <section className="mx-auto max-w-md px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)] sm:p-8">
          <h1 className="text-2xl font-extrabold text-[#7B0242]">Sign in to {site.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Use your phone number — we&apos;ll text you a one-time code.
          </p>

          {!configured ? (
            <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
              Sign-in isn&apos;t configured yet. Add{' '}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{' '}
              <code className="font-mono">.env.local</code> (see <code className="font-mono">.env.example</code>)
              and rebuild.
            </div>
          ) : (
            <>
              {/* Method tabs (visible before the OTP step) */}
              {step !== 'otp' && (
                <div className="mt-5 flex rounded-xl bg-gray-100 p-1 text-sm font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setMethod('phone');
                      setStep('phone');
                      setError(null);
                    }}
                    className={`flex-1 rounded-lg py-2 transition ${method === 'phone' ? 'bg-white text-[#7B0242] shadow' : 'text-gray-500'}`}
                  >
                    Phone (OTP)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMethod('email');
                      setStep('phone');
                      setError(null);
                    }}
                    className={`flex-1 rounded-lg py-2 transition ${method === 'email' ? 'bg-white text-[#7B0242] shadow' : 'text-gray-500'}`}
                  >
                    Email link
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* ── Phone: enter number ─────────────────────────────── */}
              {configured && step === 'phone' && method === 'phone' && (
                <div className="mt-5 space-y-3">
                  <label className="flex items-stretch gap-2">
                    <span className="flex items-center rounded-xl border border-gray-300 bg-gray-50 px-3 font-semibold text-gray-600">
                      +91
                    </span>
                    <input
                      className={inputClass}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </label>
                  <button type="button" className={primaryButtonClass} disabled={busy} onClick={sendOtp}>
                    {busy ? 'Sending…' : cooldown > 0 ? `Wait ${cooldown}s` : 'Send OTP'}
                  </button>
                </div>
              )}

              {/* ── Phone: enter code ───────────────────────────────── */}
              {configured && step === 'otp' && (
                <div className="mt-5 space-y-3">
                  <p className="text-sm text-gray-600">
                    Enter the 6-digit code sent to <span className="font-semibold">+91 {phone}</span>.
                  </p>
                  <input
                    className={`${inputClass} text-center text-xl tracking-[0.4em]`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="······"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  <button type="button" className={primaryButtonClass} disabled={busy} onClick={verifyOtp}>
                    {busy ? 'Verifying…' : 'Verify & sign in'}
                  </button>
                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      className="text-[#FF5B95] font-semibold disabled:text-gray-400"
                      disabled={cooldown > 0 || busy}
                      onClick={sendOtp}
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                    </button>
                    <button
                      type="button"
                      className="text-gray-500 underline"
                      onClick={() => {
                        setStep('phone');
                        setOtp('');
                        setError(null);
                      }}
                    >
                      Change number
                    </button>
                  </div>
                </div>
              )}

              {/* ── Email magic link ────────────────────────────────── */}
              {configured && step === 'phone' && method === 'email' && (
                <div className="mt-5 space-y-3">
                  <input
                    className={inputClass}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button type="button" className={primaryButtonClass} disabled={busy || cooldown > 0} onClick={sendMagicLink}>
                    {busy ? 'Sending…' : cooldown > 0 ? `Wait ${cooldown}s` : 'Send magic link'}
                  </button>
                </div>
              )}

              {configured && step === 'email-sent' && (
                <div className="mt-5 space-y-3">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    Check <span className="font-semibold">{email}</span> for your sign-in link. Open
                    it on this device to continue.
                  </div>
                  <button
                    type="button"
                    className="text-sm text-[#FF5B95] font-semibold underline"
                    onClick={() => setStep('phone')}
                  >
                    Use a different method
                  </button>
                </div>
              )}

              {/* ── Google ──────────────────────────────────────────── */}
              {configured && step !== 'otp' && (
                <>
                  <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
                    <span className="h-px flex-1 bg-gray-200" />
                    or
                    <span className="h-px flex-1 bg-gray-200" />
                  </div>
                  <button
                    type="button"
                    onClick={signInWithGoogle}
                    disabled={busy}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    Continue with Google
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
