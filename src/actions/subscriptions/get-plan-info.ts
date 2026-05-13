"use server";

import { createClient } from "@/utils/supabase/server";
import { FREE_PLAN_LIMITS } from "@/lib/free-plan-limits";
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

// eslint-disable-next-line react-doctor/server-auth-actions -- optional userId means callers may invoke unauthed (e.g. landing pricing); when authed, caller passes user.id explicitly
export async function getPlanInfo(userId?: string): Promise<PlanInfo> {
  const supabase = await createClient();

  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    resolvedUserId = user?.id;
  }

  const [informeResult, subscriptionResult] = await Promise.all([
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

  const currentInformes =
    (typeof informeResult === "object" && "count" in informeResult
      ? informeResult.count
      : 0) ?? 0;
  const subscription =
    typeof subscriptionResult === "object" && "data" in subscriptionResult
      ? (subscriptionResult.data as SubscriptionRow | null)
      : null;

  const access = deriveAccess(subscription);
  const freeLimit = FREE_PLAN_LIMITS.MAX_INFORMES;
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
  };
}
