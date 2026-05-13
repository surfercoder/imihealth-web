import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createClient as createCookieClient } from "@/utils/supabase/server";
import type { NextRequest } from "next/server";

/**
 * Resolves the authenticated user from either:
 *   1. Supabase SSR cookies (browser sessions, set by the middleware)
 *   2. Authorization: Bearer <access_token> (mobile clients)
 *
 * Mobile clients can't set cookies on the Next.js app, so they attach the
 * JWT issued by Supabase Auth in a Bearer header. We mint a request-scoped
 * Supabase client with that header so all subsequent .from() / .storage
 * calls run under that user's RLS context, just like the cookie path.
 */
export async function getAuthedSupabase(
  request: NextRequest,
): Promise<{ supabase: SupabaseClient; user: User } | { supabase: null; user: null }> {
  // Bearer token path takes priority when present (mobile). We short-circuit
  // on the sync header check before paying the cost of building a cookie client.
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return { supabase: null, user: null };

    const bearerSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      },
    );

    const {
      data: { user: tokenUser },
      error,
    } = await bearerSupabase.auth.getUser(token);
    if (error || !tokenUser) return { supabase: null, user: null };

    return { supabase: bearerSupabase, user: tokenUser };
  }

  // Cookie-based session (web). Reject when Supabase reports any auth error,
  // even if a stale user object is returned alongside it.
  const cookieSupabase = await createCookieClient();
  const {
    data: { user: cookieUser },
    error: cookieError,
  } = await cookieSupabase.auth.getUser();
  if (cookieError || !cookieUser) return { supabase: null, user: null };
  return { supabase: cookieSupabase, user: cookieUser };
}
