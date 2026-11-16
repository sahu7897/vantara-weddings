import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminTicket } from '@/lib/auth/admin-ticket';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, private');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed.' }); }
  const ticket = verifyAdminTicket(req.cookies.vantara_admin_entry);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!ticket || !url || !service) return res.status(401).json({ error: 'Not authenticated.' });
  const db = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: credential, error } = await db.from('admin_access_credentials').select('username,auth_user_id,is_active').eq('auth_user_id', ticket.sub).maybeSingle();
  if (error || !credential?.is_active) return res.status(401).json({ error: 'Not authenticated.' });
  const { data: profile } = await db.from('profiles').select('role,full_name').eq('id', ticket.sub).maybeSingle();
  if (profile?.role !== 'admin') return res.status(403).json({ error: 'Not authorized.' });
  return res.status(200).json({ username: credential.username, fullName: profile.full_name || 'Super Admin' });
}
