/**
 * Server-side route protection. Admin access requires BOTH a valid Supabase
 * admin session (used by existing RLS-protected panels) and the signed,
 * short-lived username/password admin-entry cookie. Other account/vendor auth
 * flows remain unchanged.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_ROLE, ROLE_HOME, getRole, type Role } from '@/lib/auth/roles';
import { verifyAdminTicketEdge } from '@/lib/auth/admin-ticket-edge';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAdmin = path === '/admin' || path.startsWith('/admin/');
  const isAdminLogin = path === '/admin/login';
  if (isAdminLogin) return NextResponse.next();

  const loginPath = isAdmin ? '/admin/login' : '/login';
  const ticket = isAdmin
    ? await verifyAdminTicketEdge(request.cookies.get('vantara_admin_entry')?.value)
    : null;
  if (isAdmin && !ticket) {
    return NextResponse.redirect(
      new URL(`/admin/login?next=${encodeURIComponent(path)}`, request.url),
    );
  }

  let response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(
      new URL(`${loginPath}?reason=unconfigured&next=${encodeURIComponent(path)}`, request.url),
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    return withAuthCookies(
      NextResponse.redirect(new URL(`${loginPath}?next=${encodeURIComponent(path)}`, request.url)),
      response,
    );
  }

  const role: Role = (await getRole(supabase, user.id)) ?? DEFAULT_ROLE;
  if (isAdmin && (role !== 'admin' || ticket?.sub !== user.id)) {
    const redirect = NextResponse.redirect(new URL('/admin/login?reason=reauth', request.url));
    redirect.cookies.delete('vantara_admin_entry');
    return withAuthCookies(redirect, response);
  }
  if (!isAdmin && path.startsWith('/vendor') && role !== 'vendor' && role !== 'admin') {
    return withAuthCookies(NextResponse.redirect(new URL(ROLE_HOME[role], request.url)), response);
  }
  return response;
}

function withAuthCookies(redirect: NextResponse, source: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value, {
      path: cookie.path, maxAge: cookie.maxAge, domain: cookie.domain, expires: cookie.expires,
      httpOnly: cookie.httpOnly, secure: cookie.secure, sameSite: cookie.sameSite,
    });
  });
  return redirect;
}

export const config = { matcher: ['/account/:path*', '/vendor/:path*', '/admin/:path*'] };
