"use server";

import { createClient } from "@/utils/supabase/server";
import { MVP_LIMITS } from "@/lib/mvp-limits";
import type {
  PlanInfo,
  PlanTier,
  SubscriptionStatus,
} from "@/types/subscription";

interface SubscriptionRow {
  plan: PlanTier;
  status: SubscriptionStatus;
  current_period_end: string | null;
}

interface AccessState {
  plan: PlanTier;
  status: SubscriptionStatus;
  isPro: boolean;
  periodEnd: string | null;
}

function deriveAccess(sub: SubscriptionRow | null): AccessState {
  const plan: PlanTier = sub?.plan ?? "free";
  const status: SubscriptionStatus = sub?.status ?? "active";
  const periodEnd = sub?.current_period_end ?? null;

  if (plan === "free" || status === "active") {
    return { plan, status, isPro: plan !== "free", periodEnd };
  }

  if (status === "past_due") {
    const periodActive = periodEnd
      ? new Date(periodEnd).getTime() > Date.now()
      : false;
    return { plan, status, isPro: periodActive, periodEnd };
  }

  return { plan, status, isPro: false, periodEnd };
}

export async function getPlanInfo(userId?: string): Promise<PlanInfo> {
  const supabase = await createClient();

  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    resolvedUserId = user?.id;
  }

  const [{ count: doctorCount }, informeResult, subscriptionResult] =
    await Promise.all([
      supabase.from("doctors").select("id", { count: "exact", head: true }),
      resolvedUserId
        ? supabase
            .from("inform_generation_log")
            .select("id", { count: "exact", head: true })
            .eq("doctor_id", resolvedUserId)
        : Promise.resolve({ count: 0 }),
      resolvedUserId
        ? supabase
            .from("subscriptions")
            .select("plan, status, current_period_end")
            .eq("user_id", resolvedUserId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const currentDoctors = doctorCount ?? 0;
  const currentInformes =
    (typeof informeResult === "object" && "count" in informeResult
      ? informeResult.count
      : 0) ?? 0;
  const subscription =
    typeof subscriptionResult === "object" && "data" in subscriptionResult
      ? (subscriptionResult.data as SubscriptionRow | null)
      : null;

  const access = deriveAccess(subscription);
  const freeLimit = MVP_LIMITS.MAX_INFORMES_PER_DOCTOR;
  const overFreeQuota = currentInformes >= freeLimit;
  const isReadOnly = !access.isPro && overFreeQuota;
  const canCreateInforme = access.isPro || !overFreeQuota;

  return {
    plan: access.plan,
    status: access.status,
    isPro: access.isPro,
    isReadOnly,
    periodEnd: access.periodEnd,
    maxInformes: freeLimit,
    currentInformes,
    canCreateInforme,
    maxDoctors: MVP_LIMITS.MAX_DOCTORS,
    currentDoctors,
    canSignUp: currentDoctors < MVP_LIMITS.MAX_DOCTORS,
  };
}
