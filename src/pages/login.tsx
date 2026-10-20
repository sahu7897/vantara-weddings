/**
 * Sign-in page (Phase 5 §13.2) — 100% Free & Open-Source Authentication.
 * Supports:
 *   1. Email + Password (instant zero-cost sign-in & sign-up, no SMS/email quotas needed).
 *   2. Email Magic Link (passwordless one-click authentication).
 *   3. Google OAuth (instant one-click social authentication).
 *   4. Phone OTP (supported when SMS gateway hook is deployed).
 *
 * Sessions live in httpOnly cookies (@supabase/ssr); after verification
 * we do a full navigation so middleware sees fresh cookies.
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

type Method = 'password' | 'email' | 'phone';
type Step = 'form' | 'otp' | 'email-sent';

const RESEND_COOLDOWN_S = 60;
const COOLDOWN_KEY = 'vantara.auth.cooldownUntil';
const DEFAULT_RATE_LIMIT_S = 60;

interface AuthErrorInfo {
  limited: boolean;
  seconds: number;
  message: string;
  notConfigured?: boolean;
}

function describeAuthError(err: unknown, channel: 'email' | 'phone'): AuthErrorInfo {
  const anyErr = err as { code?: string; status?: number; message?: string } | null;
  const raw = anyErr?.message ?? String(err ?? 'Something went wrong.');

  const phoneProviderMissing =
    channel === 'phone' &&
    (anyErr?.code === 'otp_disabled' ||
      anyErr?.code === 'phone_provider_disabled' ||
      anyErr?.code === 'unsupported_phone_provider' ||
      anyErr?.code === 'sms_provider_not_configured' ||
      /unsupported phone|phone provider|sms provider|signups not allowed for otp/i.test(raw));

  if (phoneProviderMissing) {
    return {
      limited: false,
      seconds: 0,
      notConfigured: true,
      message:
        'Phone sign-in is not enabled on this deployment — SMS requires an external telecom gateway (MSG91/Twilio). Please use "Password" or "Email link" to sign in for free.',
    };
  }

  const emailProviderMissing =
    channel === 'email' &&
    (anyErr?.code === 'email_provider_disabled' || /email.*not.*(configured|enabled)/i.test(raw));
  if (emailProviderMissing) {
    return {
      limited: false,
      seconds: 0,
      notConfigured: true,
      message:
        'Email sign-in is not configured on this deployment. Ask the site owner to add an SMTP provider in Supabase → Authentication → Emails.',
    };
  }

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
      'Wait about a minute, use Password sign-in, or connect your own free SMTP provider in ' +
      'Supabase → Authentication → Emails.',
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
    /* storage unavailable */
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

  // Default to password / email for 100% free out-of-the-box operation
  const [method, setMethod] = useState<Method>('password');
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const guardUnconfigured = router.query.reason === 'unconfigured';
  const next = safeNext(router.query.next);

  const finish = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    const signedInUser = userData.user;
    const role = (signedInUser ? await getRole(supabase, signedInUser.id) : null) ?? DEFAULT_ROLE;
    window.location.assign(next ?? ROLE_HOME[role]);
  }, [next]);

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
        /* handled by banner */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, configured, finish]);

  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const remaining = readCooldown();
    if (remaining > 0) setCooldown(remaining);
  }, []);

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

  // 1. Password Auth (Instant, Zero Quotas, 100% Free)
  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (isSignUp) {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authCallbackUrl(next) },
        });
        if (err) throw err;
        if (data.session) {
          toast.success('Account created! Logging in...');
          await finish();
        } else {
          toast.success('Account registered! You can now sign in.');
          setIsSignUp(false);
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        toast.success('Signed in successfully');
        await finish();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // 2. Email Magic Link Auth
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

  // 3. Phone OTP Auth (Optional telecom integration)
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

  // 4. Google OAuth (Free)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      setBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#7B0242] focus:ring-2 focus:ring-[#7B0242]/20';
  const primaryButtonClass =
    'w-full rounded-xl bg-[#7B0242] px-4 py-3 font-bold text-white transition hover:bg-[#5f0133] disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <>
      <Head>
        <title>{`Sign in | ${site.name}`}</title>
      </Head>
      <SiteHeader variant="sticky" />
      <section className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.06)] sm:p-8">
          <h1 className="text-2xl font-extrabold text-[#7B0242]">Sign in to {site.name}</h1>
          <p className="mt-1 text-xs text-gray-500">
            Access your wedding dashboard, leads, bookings, and CMS settings.
          </p>

          {guardUnconfigured && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-800">
              <strong>Protected page unavailable.</strong> This deployment has no Supabase credentials,
              so your identity and role cannot be checked.
            </div>
          )}

          {!configured ? (
            <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-800">
              Supabase is not configured. Add credentials in <code className="font-mono">.env.local</code>.
            </div>
          ) : (
            <>
              {/* Method tabs */}
              {step !== 'otp' && (
                <div className="mt-5 flex rounded-xl bg-gray-100 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setMethod('password');
                      setStep('form');
                      setError(null);
                    }}
                    className={`flex-1 rounded-lg py-2 transition ${
                      method === 'password' ? 'bg-white text-[#7B0242] shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMethod('email');
                      setStep('form');
                      setError(null);
                    }}
                    className={`flex-1 rounded-lg py-2 transition ${
                      method === 'email' ? 'bg-white text-[#7B0242] shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Magic link
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMethod('phone');
                      setStep('form');
                      setError(null);
                    }}
                    className={`flex-1 rounded-lg py-2 transition ${
                      method === 'phone' ? 'bg-white text-[#7B0242] shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Phone OTP
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {error}
                </div>
              )}

              {/* ── 1. Password sign-in / sign-up (Free & Instant) ────── */}
              {configured && step === 'form' && method === 'password' && (
                <form onSubmit={handlePasswordAuth} className="mt-5 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email address</label>
                    <input
                      className={inputClass}
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
                    <input
                      className={inputClass}
                      type="password"
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className={primaryButtonClass} disabled={busy}>
                    {busy ? 'Processing...' : isSignUp ? 'Create free account' : 'Sign in'}
                  </button>
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setError(null);
                      }}
                      className="text-xs text-[#7B0242] font-semibold hover:underline"
                    >
                      {isSignUp
                        ? 'Already have an account? Sign in'
                        : "Don't have an account? Create one"}
                    </button>
                  </div>
                </form>
              )}

              {/* ── 2. Email magic link ─────────────────────────────── */}
              {configured && step === 'form' && method === 'email' && (
                <div className="mt-5 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email address</label>
                    <input
                      className={inputClass}
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className={primaryButtonClass}
                    disabled={busy || cooldown > 0}
                    onClick={sendMagicLink}
                  >
                    {busy ? 'Sending...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Send magic link'}
                  </button>
                </div>
              )}

              {configured && step === 'email-sent' && (
                <div className="mt-5 space-y-3">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
                    Check <span className="font-semibold">{email}</span> for your sign-in link.
                  </div>
                  <button
                    type="button"
                    className="text-xs text-[#7B0242] font-semibold underline"
                    onClick={() => setStep('form')}
                  >
                    Use a different method
                  </button>
                </div>
              )}

              {/* ── 3. Phone OTP ────────────────────────────────────── */}
              {configured && step === 'form' && method === 'phone' && (
                <div className="mt-5 space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800 leading-relaxed">
                    <strong>Free Tier Notice:</strong> Indian SMS OTP requires an external telecom DLT
                    gateway (MSG91/Twilio). For free instant login, use the <strong>Password</strong> tab
                    above.
                  </div>
                  <label className="flex items-stretch gap-2">
                    <span className="flex items-center rounded-xl border border-gray-300 bg-gray-50 px-3 text-xs font-semibold text-gray-600">
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
                    {busy ? 'Sending...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Send OTP'}
                  </button>
                </div>
              )}

              {configured && step === 'otp' && (
                <div className="mt-5 space-y-3">
                  <p className="text-xs text-gray-600">
                    Enter the 6-digit code sent to <span className="font-semibold">+91 {phone}</span>.
                  </p>
                  <input
                    className={`${inputClass} text-center text-lg tracking-[0.3em] font-mono`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="······"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  <button type="button" className={primaryButtonClass} disabled={busy} onClick={verifyOtp}>
                    {busy ? 'Verifying...' : 'Verify & sign in'}
                  </button>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      className="text-[#7B0242] font-semibold disabled:text-gray-400"
                      disabled={cooldown > 0 || busy}
                      onClick={sendOtp}
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                    </button>
                    <button
                      type="button"
                      className="text-gray-500 underline"
                      onClick={() => {
                        setStep('form');
                        setOtp('');
                        setError(null);
                      }}
                    >
                      Change number
                    </button>
                  </div>
                </div>
              )}

              {/* ── 4. Google OAuth ─────────────────────────────────── */}
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
                    className="w-full rounded-xl border border-gray-300 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
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
