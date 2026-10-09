/**
 * Role model (Phase 5 §13.2): customer | vendor | admin, stored in
 * profiles.role — only an admin may change a role (enforced by RLS, Stage 2).
 *
 * Until the Stage 2 migrations create `profiles`, every lookup falls back to
 * DEFAULT_ROLE ('customer'), which makes /vendor/* and /admin/* strict no-entry
 * until real roles exist. Edge-safe (no Node APIs) — also imported by
 * middleware.ts.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type Role = 'customer' | 'vendor' | 'admin';

export const DEFAULT_ROLE: Role = 'customer';

/** Post-login redirect target per role (Phase 5 §13.2). */
export const ROLE_HOME: Record<Role, string> = {
  customer: '/account',
  vendor: '/vendor/dashboard',
  admin: '/admin/dashboard',
};

export const ROLE_LABEL: Record<Role, string> = {
  customer: 'Customer',
  vendor: 'Vendor',
  admin: 'Admin',
};

/**
 * Reads profiles.role for the signed-in user's own row. Returns null when the
 * row is missing or the table does not exist yet (pre-Stage-2) — callers fall
 * back to DEFAULT_ROLE.
 *
 * MUST scope to `userId`: the "own or admin reads" policy (0002) returns every
 * profile row for an admin, which made an unfiltered .maybeSingle() fail with
 * "multiple (or no) rows returned" and silently demote admins to customer.
 */
export async function getRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<Role | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data || !data.role) return null;
  const role = String(data.role);
  return role === 'vendor' || role === 'admin' ? (role as Role) : null;
}

/** Accept only same-site paths for ?next= targets (blocks open redirects). */
export function safeNext(next: unknown): string | null {
  if (typeof next !== 'string') return null;
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  if (next.startsWith('/\\') || next.includes('\\')) return null;
  return next;
}
