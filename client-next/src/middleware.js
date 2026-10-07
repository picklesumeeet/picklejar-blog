import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { updateSession } from './lib/supabase/middleware';

// Preserve link equity for the ~32 posts that moved out of the retired
// `finance` vertical. Any old /finance/<slug> URL gets a 301 to the post's
// current canonical path. Called before updateSession so the auth refresh
// isn't wasted on a redirected request.
async function handleFinanceRedirect(request) {
  const match = request.nextUrl.pathname.match(/^\/finance\/([^/]+)\/?$/);
  if (!match) return null;
  const slug = match[1];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  // Cookie no-op client — we only need read access to published post rows,
  // which RLS allows anonymously; no session juggling necessary.
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });

  const { data } = await supabase
    .from('posts')
    .select('slug, vertical:verticals(slug, active)')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  const targetSlug = data?.vertical?.slug;
  if (!targetSlug || !data.vertical.active) return null;

  const target = new URL(`/${targetSlug}/${slug}`, request.url);
  return NextResponse.redirect(target, 301);
}

export async function middleware(request) {
  // 0. Legacy /finance/<slug> → canonical vertical URL (301).
  const financeRedirect = await handleFinanceRedirect(request);
  if (financeRedirect) return financeRedirect;

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
