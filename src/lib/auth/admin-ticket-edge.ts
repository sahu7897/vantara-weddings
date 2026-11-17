const encoder = new TextEncoder();
const secret = () => process.env.ADMIN_SESSION_SECRET ?? '';
const toBase64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const fromBase64Url = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)), (c) => c.charCodeAt(0));

async function key(): Promise<CryptoKey | null> {
  if (secret().length < 32) return null;
  return crypto.subtle.importKey('raw', encoder.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function verifyAdminTicketEdge(value: string | undefined): Promise<{ sub: string; exp: number } | null> {
  if (!value) return null;
  const [body, signature, extra] = value.split('.');
  const signingKey = await key();
  if (!body || !signature || extra || !signingKey) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', signingKey, fromBase64Url(signature), encoder.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as { sub?: string; exp?: number };
    return typeof payload.sub === 'string' && Number.isInteger(payload.exp) && payload.exp! > Date.now() / 1000 ? { sub: payload.sub, exp: payload.exp! } : null;
  } catch { return null; }
}

export async function issueAdminTicketEdge(userId: string): Promise<string> {
  const signingKey = await key();
  if (!signingKey) throw new Error('Admin session is not securely configured.');
  const payload = toBase64Url(encoder.encode(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60 })));
  const signature = await crypto.subtle.sign('HMAC', signingKey, encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}
