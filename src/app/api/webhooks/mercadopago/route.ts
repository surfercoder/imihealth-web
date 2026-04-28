// MercadoPago webhook receiver.
//
// MP delivers notifications for subscription_preapproval (subscription
// lifecycle: authorized → cancelled, etc.) and subscription_authorized_payment
// (each recurring charge). For every event we re-fetch the resource from the
// MP API and reconcile the `subscriptions` row.
//
// The handler is idempotent: MP retries on non-2xx, and replays may arrive
// out of order. Every update is derived from the current MP state, not from
// the notification payload, so retries are safe.

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/utils/supabase/server";
import {
  getPreapproval,
  getAuthorizedPayment,
  type Preapproval,
  type PreapprovalStatus,
} from "@/lib/mercadopago/api";
import { verifyWebhookSignature } from "@/lib/mercadopago/webhook";
import type {
  PlanTier,
  SubscriptionStatus,
} from "@/actions/plan";

interface NotificationBody {
  type?: string;
  action?: string;
  data?: { id?: string | number };
}

function mapPreapprovalStatus(
  status: PreapprovalStatus,
): SubscriptionStatus {
  switch (status) {
    case "authorized":
      return "active";
    case "cancelled":
      return "cancelled";
    case "paused":
      return "past_due";
    case "pending":
    default:
      return "pending";
  }
}

function planTierFromAmount(p: Preapproval): PlanTier {
  // Yearly plans bill once every 12 months. Anything else we treat as monthly.
  if (
    p.auto_recurring.frequency_type === "months" &&
    p.auto_recurring.frequency >= 12
  ) {
    return "pro_yearly";
  }
  return "pro_monthly";
}

async function handlePreapproval(dataId: string) {
  const preapproval = await getPreapproval(dataId);
  const admin = createServiceClient();

  const userId = preapproval.external_reference;
  if (!userId) {
    console.warn(
      `[mp-webhook] preapproval ${dataId} has no external_reference; skipping`,
    );
    return;
  }

  await admin
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        plan: planTierFromAmount(preapproval),
        status: mapPreapprovalStatus(preapproval.status),
        mp_preapproval_id: preapproval.id,
        mp_payer_id: preapproval.payer_id ? String(preapproval.payer_id) : null,
        current_period_end: preapproval.next_payment_date,
        cancelled_at:
          preapproval.status === "cancelled"
            ? new Date().toISOString()
            : null,
      },
      { onConflict: "user_id" },
    );
}

async function handleAuthorizedPayment(dataId: string) {
  const payment = await getAuthorizedPayment(dataId);
  const admin = createServiceClient();

  // Each recurring charge points back to its preapproval. We reconcile the
  // owning subscription by mp_preapproval_id rather than user_id.
  const { data: sub } = await admin
    .from("subscriptions")
    .select("user_id, plan, status, current_period_end")
    .eq("mp_preapproval_id", payment.preapproval_id)
    .maybeSingle();
  if (!sub) {
    console.warn(
      `[mp-webhook] authorized_payment ${dataId} for unknown preapproval ${payment.preapproval_id}`,
    );
    return;
  }

  // Re-fetch the parent preapproval for the authoritative next_payment_date
  // and status — MP updates both atomically when a charge succeeds.
  const preapproval = await getPreapproval(payment.preapproval_id);

  let nextStatus: SubscriptionStatus;
  if (payment.payment_status === "rejected") {
    nextStatus = "past_due";
  } else if (preapproval.status === "cancelled") {
    nextStatus = "cancelled";
  } else if (preapproval.status === "authorized") {
    nextStatus = "active";
  } else {
    nextStatus = mapPreapprovalStatus(preapproval.status);
  }

  await admin
    .from("subscriptions")
    .update({
      status: nextStatus,
      current_period_end: preapproval.next_payment_date,
    })
    .eq("user_id", sub.user_id);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const queryDataId = url.searchParams.get("data.id");
  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");

  let body: NotificationBody = {};
  try {
    body = (await request.json()) as NotificationBody;
  } catch {
    // Some MP retries send empty bodies; we still rely on query params.
  }

  const dataId =
    queryDataId ?? (body.data?.id != null ? String(body.data.id) : null);

  const verification = verifyWebhookSignature({
    signatureHeader,
    requestId,
    dataId,
    secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
  });
  if (!verification.ok) {
    console.warn(
      `[mp-webhook] signature verification failed: ${verification.reason}`,
    );
    return new NextResponse("invalid signature", { status: 401 });
  }

  const type = body.type ?? url.searchParams.get("type");

  try {
    if (type === "subscription_preapproval") {
      await handlePreapproval(dataId!);
    } else if (type === "subscription_authorized_payment") {
      await handleAuthorizedPayment(dataId!);
    } else {
      // Unknown topic → ack so MP stops retrying. Log for visibility.
      console.info(`[mp-webhook] ignoring topic=${type}`);
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { flow: "mp-webhook", type } });
    console.error("[mp-webhook] processing error", err);
    return new NextResponse("error", { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
