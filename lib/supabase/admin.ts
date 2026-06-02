import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS.
// ⚠️  NEVER import this file from any client-side component.
// Only use in Server Actions and API Route handlers.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase service role env vars");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
