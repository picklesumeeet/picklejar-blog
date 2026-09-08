import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Service-role client. Bypasses RLS. Use only in Server Actions / Route Handlers
// for privileged operations: creating users, admin dashboard writes, data
// migration, cron-adjacent work. NEVER import this from a Client Component.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
