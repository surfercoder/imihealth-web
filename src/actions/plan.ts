"use server";

import { createClient } from "@/utils/supabase/server";
import { MVP_LIMITS } from "@/lib/mvp-limits";

export type PlanTier = "free" | "pro_monthly" | "pro_yearly";
export type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "past_due"
  | "pending";

export interface PlanInfo {
  plan: PlanTier;
  status: SubscriptionStatus;
  isPro: boolean;
  isReadOnly: boolean;
  periodEnd: string | null;
  maxInformes: number;
  currentInformes: number;
  canCreateInforme: boolean;
  maxDoctors: number;
  currentDoctors: number;
  canSignUp: boolean;
}

interface SubscriptionRow {
  plan: PlanTier;
  status: SubscriptionStatus;
  current_period_end: string | null;
}

interface AccessState {
  plan: PlanTier;
  status: SubscriptionStatus;
  isPro: boolean;
  isReadOnly: boolean;
  periodEnd: string | null;
}

function deriveAccess(sub: SubscriptionRow | null): AccessState {
  const plan: PlanTier = sub?.plan ?? "free";
  const status: SubscriptionStatus = sub?.status ?? "active";
  const periodEnd = sub?.current_period_end ?? null;

  if (plan === "free") {
    return { plan, status, isPro: false, isReadOnly: false, periodEnd };
  }

  const periodActive = periodEnd
    ? new Date(periodEnd).getTime() > Date.now()
    : false;

  if (status === "active") {
    return { plan, status, isPro: true, isReadOnly: false, periodEnd };
  }
  if ((status === "cancelled" || status === "past_due") && periodActive) {
    return { plan, status, isPro: true, isReadOnly: false, periodEnd };
  }
  if (status === "cancelled" || status === "past_due") {
    return { plan, status, isPro: false, isReadOnly: true, periodEnd };
  }
  // pending → treat as free until activated by webhook
  return { plan, status, isPro: false, isReadOnly: false, periodEnd };
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
  const canCreateInforme =
    !access.isReadOnly && (access.isPro || !overFreeQuota);

  return {
    plan: access.plan,
    status: access.status,
    isPro: access.isPro,
    isReadOnly: access.isReadOnly,
    periodEnd: access.periodEnd,
    maxInformes: freeLimit,
    currentInformes,
    canCreateInforme,
    maxDoctors: MVP_LIMITS.MAX_DOCTORS,
    currentDoctors,
    canSignUp: currentDoctors < MVP_LIMITS.MAX_DOCTORS,
  };
}
