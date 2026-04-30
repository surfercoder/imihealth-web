// MercadoPago webhook receiver.
//
// MP delivers notifications for subscription_preapproval (subscription
// lifecycle: authorized → cancelled, etc.) and subscription_authorized_payment
// (each recurring charge). The actual reconciliation logic lives in
// src/lib/billing/reconcile.ts so /billing/return can call it server-side
// without depending on this webhook firing — that's the primary path for
// the signup happy flow; this webhook is a backup for async events
// (delayed delivery, cancellations from MP's portal, recurring payments).

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/utils/supabase/server";
import { getAuthorizedPayment, getPreapproval } from "@/lib/mercadopago/api";
import { verifyWebhookSignature } from "@/lib/mercadopago/webhook";
import {
  mapPreapprovalStatus,
  reconcilePreapproval,
} from "@/lib/billing/reconcile";
import type { SubscriptionStatus } from "@/actions/plan";

interface NotificationBody {
  type?: string;
  action?: string;
  data?: { id?: string | number };
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
      await reconcilePreapproval(dataId!);
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
