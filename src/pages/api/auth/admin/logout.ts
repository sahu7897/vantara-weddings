import { createServerClient } from '@supabase/ssr';
import { serialize } from 'cookie';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] ?? req.headers.host;
  try { if (!origin || !host || new URL(origin).host !== String(host).split(',')[0].trim()) return res.status(403).json({ error: 'Request origin rejected.' }); }
  catch { return res.status(403).json({ error: 'Request origin rejected.' }); }
  const secure = process.env.NODE_ENV === 'production';
  const lines = [serialize('vantara_admin_entry', '', { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge: 0 })];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => Object.entries(req.cookies).filter((entry): entry is [string, string] => typeof entry[1] === 'string').map(([name, value]) => ({ name, value })),
        setAll: (cookies) => { lines.push(...cookies.map(({ name, value, options }) => serialize(name, value, { ...options, maxAge: 0 }))); },
      },
    });
    await supabase.auth.signOut();
  }
  res.setHeader('Set-Cookie', lines);
  return res.status(200).json({ ok: true });
}
