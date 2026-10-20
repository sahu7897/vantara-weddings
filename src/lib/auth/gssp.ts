/**
 * Shared getServerSideProps guard for auth-gated pages (Phase 5 §13.2):
 * server-side protection + role check — never UI-only. Middleware already
 * gates the same paths; this makes each page independently safe.
 */
import type { GetServerSideProps, GetServerSidePropsResult } from 'next';
import { createGsspSupabase, isSupabaseConfiguredServer } from '@/lib/supabase/server';
import { DEFAULT_ROLE, ROLE_HOME, getRole, type Role } from './roles';

/**
 * Where to send a visitor when this build cannot verify identity or role.
 *
 * FAIL CLOSED (security): `requireAuth` used to return a `{ configured: false }`
 * props object here, i.e. it let the guarded page render its shell and only
 * showed a "Supabase isn't configured" notice. Every page using this guard is a
 * dashboard (/account, /vendor/*, /admin/*) whose body is meant to be
 * restricted, so a missing or typo'd NEXT_PUBLIC_SUPABASE_* value would have
 * rendered /admin/dashboard with no identity check at all. Redirecting makes
 * the failure mode "no access", never "unverified access".
 *
 * /login is intentionally NOT behind this guard, so this cannot loop.
 */
const UNCONFIGURED_REDIRECT = '/login?reason=unconfigured';

export interface AuthPageProps {
  configured: boolean;
  role: Role;
  phone: string;
  email: string;
  memberSince: string | null;
}

export function requireAuth(options: {
  /** The page's own path — used as ?next= after signing in. */
  path: string;
  /** Roles allowed; omit to allow any signed-in user. */
  roles?: Role[];
}): GetServerSideProps<AuthPageProps> {
  return async (ctx): Promise<GetServerSidePropsResult<AuthPageProps>> => {
    if (!isSupabaseConfiguredServer()) {
      // Cannot verify session or role -> never render a protected page.
      return { redirect: { destination: UNCONFIGURED_REDIRECT, permanent: false } };
    }
    try {
      const supabase = createGsspSupabase(ctx);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return {
          redirect: {
            destination: `/login?next=${encodeURIComponent(options.path)}`,
            permanent: false,
          },
        };
      }
      const role = (await getRole(supabase, user.id)) ?? DEFAULT_ROLE;
      if (options.roles && !options.roles.includes(role)) {
        return { redirect: { destination: ROLE_HOME[role], permanent: false } };
      }
      return {
        props: {
          configured: true,
          role,
          phone: user.phone ?? '',
          email: user.email ?? '',
          memberSince: user.created_at ?? null,
        },
      };
    } catch {
      // A missing env value or a session/RLS failure means identity is unknown.
      // Fail closed rather than rendering the page unverified.
      return { redirect: { destination: UNCONFIGURED_REDIRECT, permanent: false } };
    }
  };
}
