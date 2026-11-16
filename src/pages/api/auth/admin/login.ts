import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { scryptSync, timingSafeEqual, createHmac } from 'node:crypto';
import { serialize } from 'cookie';
import type { NextApiRequest, NextApiResponse } from 'next';
import { issueAdminTicketEdge } from '@/lib/auth/admin-ticket-edge';

const COOKIE = 'vantara_admin_entry';
const validOrigin = (req: NextApiRequest) => {
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] ?? req.headers.host;
  try { return Boolean(origin && host && new URL(origin).host === String(host).split(',')[0].trim()); } catch { return false; }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
  if (!validOrigin(req)) return res.status(403).json({ error: 'Request origin rejected.' });
  if (!process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET.length < 32) return res.status(503).json({ error: 'Admin authentication is not configured.' });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !anonKey) return res.status(503).json({ error: 'Admin authentication is not configured.' });
  const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!/^[a-z0-9-]{8,48}$/.test(username) || password.length < 16 || password.length > 256) return res.status(401).json({ error: 'Invalid username or password.' });

  const adminDb = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const address = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').split(',')[0].trim();
  const sourceHash = createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(address).digest('hex');
  let limited: boolean | null = null;
  try {
    const throttle = await adminDb.rpc('admin_login_is_limited', { p_source_hash: sourceHash });
    if (throttle.error) return res.status(503).json({ error: 'Secure login throttling is not ready.' });
    limited = throttle.data;
  } catch { return res.status(503).json({ error: 'Secure login throttling is not ready.' }); }
  if (limited) return res.status(429).json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' });

  const { data: credential, error: credentialError } = await adminDb.from('admin_access_credentials').select('username,password_salt,password_hash,auth_user_id,is_active').eq('username', username).maybeSingle();
  if (credentialError) return res.status(503).json({ error: 'Admin sign-in is unavailable. Please try again later.' });
  const storedHashIsValid = typeof credential?.password_hash === 'string' && /^[0-9a-f]{128}$/i.test(credential.password_hash);
  const storedSaltIsValid = typeof credential?.password_salt === 'string' && /^[0-9a-f]{32}$/i.test(credential.password_salt);
  const salt = storedSaltIsValid ? credential.password_salt : '00'.repeat(16);
  const expectedHash = storedHashIsValid ? credential.password_hash : '0'.repeat(128);
  const actualHash = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex');
  const hashesMatch = timingSafeEqual(Buffer.from(actualHash, 'hex'), Buffer.from(expectedHash, 'hex'));
  const valid = Boolean(credential && credential.is_active && storedHashIsValid && storedSaltIsValid && credential.username === username && hashesMatch);
  if (!valid) {
    const throttle = await adminDb.rpc('admin_login_record_failure', { p_source_hash: sourceHash });
    if (throttle.error) return res.status(503).json({ error: 'Secure login throttling is unavailable.' });
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  if (!credential) return res.status(401).json({ error: 'Invalid username or password.' });
  const { data: profile, error: profileError } = await adminDb.from('profiles').select('role').eq('id', credential.auth_user_id).maybeSingle();
  if (profileError || profile?.role !== 'admin') return res.status(403).json({ error: 'This account is not authorized for Admin access.' });
  const { data: authUser, error: userError } = await adminDb.auth.admin.getUserById(credential.auth_user_id);
  if (userError || !authUser.user?.email) return res.status(403).json({ error: 'Admin account is inactive or unavailable.' });
  const { data: link, error: linkError } = await adminDb.auth.admin.generateLink({ type: 'magiclink', email: authUser.user.email });
  if (linkError || !link.properties?.hashed_token) return res.status(502).json({ error: 'Could not establish an authenticated admin session.' });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => Object.entries(req.cookies).filter((entry): entry is [string, string] => typeof entry[1] === 'string').map(([name, value]) => ({ name, value })),
      setAll: (cookies, headers) => {
        const lines = cookies.map(({ name, value, options }) => serialize(name, value, options));
        const existing = res.getHeader('Set-Cookie');
        const previous = Array.isArray(existing) ? existing.map(String) : existing ? [String(existing)] : [];
        res.setHeader('Set-Cookie', [...previous, ...lines]);
        for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
      },
    },
  });
  const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' });
  if (verifyError || !sessionData.user || sessionData.user.id !== credential.auth_user_id) return res.status(502).json({ error: 'Could not establish an authenticated admin session.' });

  const clearThrottle = await adminDb.rpc('admin_login_clear_failures', { p_source_hash: sourceHash });
  if (clearThrottle.error) return res.status(503).json({ error: 'Secure login throttling is unavailable.' });
  const secure = process.env.NODE_ENV === 'production';
  const current = res.getHeader('Set-Cookie');
  const cookieLines = Array.isArray(current) ? current.map(String) : current ? [String(current)] : [];
  cookieLines.push(serialize(COOKIE, await issueAdminTicketEdge(credential.auth_user_id), { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60 }));
  res.setHeader('Set-Cookie', cookieLines);
  return res.status(200).json({ ok: true, redirect: '/admin/dashboard' });
}
