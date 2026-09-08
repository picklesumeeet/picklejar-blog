import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Called from the top-level Next.js middleware on every matched request.
// Refreshes the Supabase session cookie so Server Components see a fresh user,
// then enforces the admin-route gate. Returns { response, user } so the caller
// can attach additional headers (CSP nonce, etc.) before returning.
export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  return { response, user };
}
