import { NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

export async function middleware(request) {
  // 1. Refresh Supabase session cookies on every request. `response` may have
  //    Set-Cookie headers attached — we preserve them below.
  const { response, user } = await updateSession(request);

  // 2. Admin route gate. Unauthenticated users hitting /admin/* get bounced,
  //    except for the public auth pages (login, forgot-password, reset).
  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith('/admin');
  const isPublicAdminPage =
    pathname === '/admin/login' ||
    pathname.startsWith('/admin/forgot-password') ||
    pathname.startsWith('/admin/reset-password');

  if (isAdminRoute && !isPublicAdminPage && !user) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  if (pathname === '/admin' && user) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // 3. Content-Security-Policy. Supabase's REST + Realtime endpoints must be
  //    reachable from the browser, so we allow the project origin explicitly.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  const supabaseOrigin = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
    } catch {
      return '';
    }
  })();
  const supabaseWs = supabaseOrigin ? supabaseOrigin.replace(/^https/, 'wss') : '';

  const csp = `
    default-src 'self';
    script-src ${scriptSrc} https://www.googletagmanager.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https://res.cloudinary.com https://via.placeholder.com https://www.google-analytics.com https://www.googletagmanager.com;
    font-src 'self' https://fonts.gstatic.com;
    frame-src 'none';
    connect-src 'self' ${supabaseOrigin} ${supabaseWs} https://api.cloudinary.com https://*.sentry.io https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com;
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-nonce', nonce);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
