// Mobile equivalent of the upgrade-from-free flow that the web app drives via
// the pricing page server action. The mobile client (already authenticated via
// the JWT Bearer header) POSTs { plan }, and we return the MP init_point plus
// the user.id as ref so the mobile billing/return screen can poll/reconcile.

import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/utils/supabase/api-auth";
import { startProCheckout } from "@/actions/subscriptions";
import type { ProPlanTier } from "@/actions/subscriptions";

export async function POST(request: NextRequest) {
  const { user } = await getAuthedSupabase(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const plan = body?.plan as string | undefined;
  if (plan !== "pro_monthly" && plan !== "pro_yearly") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const checkout = await startProCheckout(plan as ProPlanTier, user.id);
  if (checkout.error || !checkout.initPoint) {
    return NextResponse.json(
      { error: checkout.error ?? "Failed to start checkout" },
      { status: 500 },
    );
  }

  return NextResponse.json({ initPoint: checkout.initPoint, ref: user.id });
}
