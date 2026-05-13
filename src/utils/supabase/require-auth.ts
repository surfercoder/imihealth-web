import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

/**
 * Cookie-session auth helper for server actions. Wraps `supabase.auth.getUser()`
 * so callers can express the check as one named call — both for readability and
 * so static analyzers (e.g. react-doctor's server-auth-actions rule) recognize
 * the auth gate.
 *
 * Returns the supabase client alongside the user so downstream queries reuse
 * the same request-scoped, RLS-bound client.
 */
export async function requireAuth(): Promise<
  { supabase: SupabaseClient; user: User } | { supabase: null; user: null }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, user: null };
  return { supabase, user };
}
