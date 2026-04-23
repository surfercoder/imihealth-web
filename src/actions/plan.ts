"use server";

import { createClient } from "@/utils/supabase/server";
import { MVP_LIMITS } from "@/lib/mvp-limits";

export interface PlanInfo {
  maxInformes: number;
  currentInformes: number;
  canCreateInforme: boolean;
  maxDoctors: number;
  currentDoctors: number;
  canSignUp: boolean;
}

export async function getPlanInfo(userId?: string): Promise<PlanInfo> {
  const supabase = await createClient();

  // Resolve userId if not provided (for backward compatibility)
  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    resolvedUserId = user?.id;
  }

  // Run all queries in parallel
  const [{ count: doctorCount }, informeResult] = await Promise.all([
    supabase.from("doctors").select("id", { count: "exact", head: true }),
    resolvedUserId
      ? supabase
          .from("inform_generation_log")
          .select("id", { count: "exact", head: true })
          .eq("doctor_id", resolvedUserId)
      : Promise.resolve({ count: 0 }),
  ]);

  const currentDoctors = doctorCount ?? 0;
  const currentInformes =
    (typeof informeResult === "object" && "count" in informeResult
      ? informeResult.count
      : 0) ?? 0;

  return {
    maxInformes: MVP_LIMITS.MAX_INFORMES_PER_DOCTOR,
    currentInformes,
    canCreateInforme: currentInformes < MVP_LIMITS.MAX_INFORMES_PER_DOCTOR,
    maxDoctors: MVP_LIMITS.MAX_DOCTORS,
    currentDoctors,
    canSignUp: currentDoctors < MVP_LIMITS.MAX_DOCTORS,
  };
}
