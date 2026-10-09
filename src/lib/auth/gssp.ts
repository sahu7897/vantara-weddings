/**
 * Shared getServerSideProps guard for auth-gated pages (Phase 5 §13.2):
 * server-side protection + role check — never UI-only. Middleware already
 * gates the same paths; this makes each page independently safe.
 */
import type { GetServerSideProps, GetServerSidePropsResult } from 'next';
import { createGsspSupabase, isSupabaseConfiguredServer } from '@/lib/supabase/server';
import { DEFAULT_ROLE, ROLE_HOME, getRole, type Role } from './roles';

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
      return {
        props: { configured: false, role: DEFAULT_ROLE, phone: '', email: '', memberSince: null },
      };
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
      // Missing env/config — render the setup notice instead of crashing.
      return {
        props: { configured: false, role: DEFAULT_ROLE, phone: '', email: '', memberSince: null },
      };
    }
  };
}
