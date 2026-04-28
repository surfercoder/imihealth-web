import { cache } from "react";
import { createClient } from "@/utils/supabase/server";

/**
 * Request-scoped cached queries using React.cache().
 * Within a single server render pass, duplicate calls return the same promise.
 */

export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  return supabase.auth.getUser();
});

export const getDoctor = cache(async (userId: string) => {
  const supabase = await createClient();
  return supabase
    .from("doctors")
    .select("name, email, dni, matricula, phone, especialidad, tagline, firma_digital, avatar")
    .eq("id", userId)
    .single();
});
