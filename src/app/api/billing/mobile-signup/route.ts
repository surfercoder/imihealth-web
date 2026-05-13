// Mobile clients can't run server actions or share cookies, so they POST the
// signup form here. We reuse the same logic as actions/auth.signup's pro branch
// — stage pending_signups, then call startProCheckoutForPendingSignup — but
// return the pending_signup id back to the client so the mobile billing/return
// screen can poll signup-status with it. (Web stashes the same id in a signed
// `mp_checkout_ref` cookie that mobile can't read.)

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { signupSchema } from "@/schemas/auth";
import { encryptPassword } from "@/lib/signup-password-crypto";
import { startProCheckoutForPendingSignup } from "@/actions/subscriptions";
import type { ProPlanTier } from "@/actions/subscriptions";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const plan = body.plan as string | undefined;
  if (plan !== "pro_monthly" && plan !== "pro_yearly") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const raw = {
    name: body.name || undefined,
    email: body.email,
    password: body.password,
    confirmPassword: body.confirmPassword,
    dni: body.dni || undefined,
    matricula: body.matricula,
    phone: body.phone,
    especialidad: body.especialidad,
    tagline: body.tagline || undefined,
    firmaDigital: body.firmaDigital || undefined,
    avatar: body.avatar || undefined,
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const admin = createAdminClient();
  const { data: existingDoctor } = await admin
    .from("doctors")
    .select("id")
    .eq("email", data.email)
    .maybeSingle();
  if (existingDoctor) {
    return NextResponse.json(
      { error: "Ya existe una cuenta con ese email." },
      { status: 409 },
    );
  }
  await admin.from("pending_signups").delete().eq("email", data.email);

  const signupData = {
    plan,
    name: data.name ?? "",
    dni: data.dni ?? null,
    matricula: data.matricula,
    phone: data.phone,
    especialidad: data.especialidad,
    tagline: data.tagline ?? null,
    firmaDigital: data.firmaDigital ?? null,
    avatar: data.avatar ?? null,
  };

  const { data: pending, error: pendingErr } = await admin
    .from("pending_signups")
    .insert({
      email: data.email,
      encrypted_password: encryptPassword(data.password),
      signup_data: signupData,
    })
    .select("id")
    .single();
  if (pendingErr || !pending) {
    return NextResponse.json(
      { error: "No se pudo iniciar el registro. Intentá nuevamente." },
      { status: 500 },
    );
  }

  const checkout = await startProCheckoutForPendingSignup(pending.id, plan as ProPlanTier);
  if (checkout.error || !checkout.initPoint) {
    await admin.from("pending_signups").delete().eq("id", pending.id);
    return NextResponse.json(
      { error: checkout.error ?? "No se pudo iniciar el pago." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    initPoint: checkout.initPoint,
    ref: pending.id,
  });
}
