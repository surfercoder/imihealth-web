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

export async function getPlanInfo(): Promise<PlanInfo> {
  const supabase = await createClient();

  const [{ count: doctorCount }, userResult] = await Promise.all([
    supabase.from("doctors").select("id", { count: "exact", head: true }),
    supabase.auth.getUser(),
  ]);

  const currentDoctors = doctorCount ?? 0;
  let currentInformes = 0;

  if (userResult.data.user) {
    const { count: informeCount } = await supabase
      .from("informes")
      .select("id", { count: "exact", head: true })
      .eq("doctor_id", userResult.data.user.id);

    currentInformes = informeCount ?? 0;
  }

  return {
    maxInformes: MVP_LIMITS.MAX_INFORMES_PER_DOCTOR,
    currentInformes,
    canCreateInforme: currentInformes < MVP_LIMITS.MAX_INFORMES_PER_DOCTOR,
    maxDoctors: MVP_LIMITS.MAX_DOCTORS,
    currentDoctors,
    canSignUp: currentDoctors < MVP_LIMITS.MAX_DOCTORS,
  };
}
