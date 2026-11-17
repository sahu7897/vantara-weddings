import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'vantara_admin_entry';
const MAX_AGE_SECONDS = 8 * 60 * 60;
const secret = () => process.env.ADMIN_SESSION_SECRET ?? '';

export interface AdminTicket { sub: string; exp: number }

export function issueAdminTicket(userId: string): string {
  if (secret().length < 32) throw new Error('Admin session is not securely configured.');
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS })).toString('base64url');
  const signature = createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyAdminTicket(value: string | undefined): AdminTicket | null {
  if (!value || secret().length < 32) return null;
  const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra) return null;
  const expected = createHmac('sha256', secret()).update(payload).digest();
  let actual: Buffer;
  try { actual = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const ticket = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AdminTicket;
    if (typeof ticket.sub !== 'string' || !ticket.sub || !Number.isInteger(ticket.exp) || ticket.exp <= Date.now() / 1000) return null;
    return ticket;
  } catch { return null; }
}

export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: MAX_AGE_SECONDS,
};
