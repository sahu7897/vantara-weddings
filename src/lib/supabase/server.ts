/**
 * Server-side Supabase client for getServerSideProps / API routes (Phase 5 §13).
 *
 * The session lives in httpOnly cookies; @supabase/ssr writes refreshed tokens
 * back to the outgoing response as Set-Cookie headers.
 *
 * IMPORTANT (Supabase docs): call getUser()/getClaims() early in the handler,
 * before the response is committed — otherwise a token refresh can no longer be
 * persisted and the client would refresh again on every request.
 */
import { createServerClient } from '@supabase/ssr';
import { serialize } from 'cookie';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { GetServerSidePropsContext } from 'next';

interface ReqLike {
  cookies: Record<string, string | undefined>;
}

interface ResLike {
  getHeader(name: string): number | string | string[] | undefined;
  setHeader(name: string, value: number | string | readonly string[]): void;
}

export function isSupabaseConfiguredServer(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function createServerSupabase(req: ReqLike, res: ResLike): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).',
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () =>
        Object.entries(req.cookies)
          .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
          .map(([name, value]) => ({ name, value })),
      setAll: (cookiesToSet, headers) => {
        const lines = cookiesToSet.map(({ name, value, options }) =>
          serialize(name, value, options),
        );
        const existing = res.getHeader('Set-Cookie');
        const previous = Array.isArray(existing)
          ? existing.map(String)
          : existing
            ? [String(existing)]
            : [];
        res.setHeader('Set-Cookie', [...previous, ...lines]);
        for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
      },
    },
  });
}

/** Convenience wrapper for GetServerSideProps handlers. */
export function createGsspSupabase(ctx: GetServerSidePropsContext): SupabaseClient {
  return createServerSupabase(ctx.req, ctx.res);
}
