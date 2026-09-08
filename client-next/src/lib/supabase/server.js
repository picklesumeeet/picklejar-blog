import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Server-side Supabase client for Server Components, Server Actions, and Route Handlers.
// Reads and writes auth cookies via the Next.js `cookies()` store.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In Server Components, `cookieStore.set` will throw. Swallow it — the
          // middleware refreshes the session cookie on every request.
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            /* no-op in RSC */
          }
        },
      },
    },
  );
}
