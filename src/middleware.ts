/**
 * Server-side route protection (Phase 5 §13.2).
 *
 * Sessions live in httpOnly cookies; this middleware refreshes them and gates
 * /account, /vendor/*, /admin/* — protection is NOT UI-only. Role gating uses
 * profiles.role (Stage 2); until that table exists every lookup falls back to
 * 'customer', so /vendor and /admin stay closed until real roles are assigned.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_ROLE, ROLE_HOME, getRole, type Role } from '@/lib/auth/roles';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Not configured (no keys in this build) → /login explains the setup.
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(request.nextUrl.pathname)}`, request.url),
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        // Mirror refreshed tokens onto the incoming request (immediate read-back)
        // and onto the outgoing response (persistence), per @supabase/ssr docs.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Validate/refresh the session BEFORE any response is committed.
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const path = request.nextUrl.pathname;

  if (!user) {
    return withAuthCookies(
      NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(path)}`, request.url)),
      response,
    );
  }

  const role: Role = (await getRole(supabase, user.id)) ?? DEFAULT_ROLE;

  if (path.startsWith('/admin') && role !== 'admin') {
    return withAuthCookies(NextResponse.redirect(new URL(ROLE_HOME[role], request.url)), response);
  }
  if (path.startsWith('/vendor') && role !== 'vendor' && role !== 'admin') {
    return withAuthCookies(NextResponse.redirect(new URL(ROLE_HOME[role], request.url)), response);
  }

  return response;
}

/** Copy auth cookies written during the session check onto a redirect response. */
function withAuthCookies(redirect: NextResponse, source: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      maxAge: cookie.maxAge,
      domain: cookie.domain,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    });
  });
  return redirect;
}

export const config = {
  matcher: ['/account/:path*', '/vendor/:path*', '/admin/:path*'],
};
