"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/schemas/auth";
import type { ActionResult } from "@/types/auth";
import { MVP_LIMITS } from "@/lib/mvp-limits";
import {
  startProCheckoutForPendingSignup,
  type ProPlanTier,
} from "@/actions/billing";
import { encryptPassword } from "@/lib/signup-password-crypto";

export async function login(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  redirect("/?welcome=true");
}

export async function signup(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const g = (key: string) => formData.get(key) ?? "";
  const opt = (key: string) => { const v = g(key); return v === "" ? undefined : v; };
  const raw = {
    name: opt("name"),
    email: g("email"),
    password: g("password"),
    confirmPassword: g("confirmPassword"),
    dni: opt("dni"),
    matricula: g("matricula"),
    phone: g("phone"),
    especialidad: g("especialidad"),
    tagline: opt("tagline"),
    firmaDigital: opt("firmaDigital"),
    avatar: opt("avatar"),
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const admin = createAdminClient();

  // Combined headcount: existing doctors + pending signups awaiting payment.
  // Both eventually count against the MVP limit, so we gate signup on the sum.
  const [{ count: doctorCount }, { count: pendingCount }] = await Promise.all([
    admin.from("doctors").select("id", { count: "exact", head: true }),
    admin.from("pending_signups").select("id", { count: "exact", head: true }),
  ]);
  /* v8 ignore next */
  if ((doctorCount ?? 0) + (pendingCount ?? 0) >= MVP_LIMITS.MAX_DOCTORS) {
    return { error: `Hemos alcanzado el límite de ${MVP_LIMITS.MAX_DOCTORS} médicos para la fase de prueba MVP.` };
  }

  // Reject signup if email already maps to a real account. Pending signups
  // with the same email get replaced (user retried before paying).
  const { data: existingDoctor } = await admin
    .from("doctors")
    .select("id")
    .eq("email", parsed.data.email)
    .maybeSingle();
  if (existingDoctor) {
    return { error: "Ya existe una cuenta con ese email." };
  }
  await admin
    .from("pending_signups")
    .delete()
    .eq("email", parsed.data.email);

  const planRaw = g("plan");
  const plan: ProPlanTier =
    planRaw === "pro_yearly" ? "pro_yearly" : "pro_monthly";

  const signupData = {
    plan,
    name: parsed.data.name ?? "",
    dni: parsed.data.dni ?? null,
    matricula: parsed.data.matricula,
    phone: parsed.data.phone,
    especialidad: parsed.data.especialidad,
    tagline: parsed.data.tagline ?? null,
    firmaDigital: parsed.data.firmaDigital ?? null,
    avatar: parsed.data.avatar ?? null,
  };

  const { data: pending, error: pendingErr } = await admin
    .from("pending_signups")
    .insert({
      email: parsed.data.email,
      encrypted_password: encryptPassword(parsed.data.password),
      signup_data: signupData,
    })
    .select("id")
    .single();
  if (pendingErr || !pending) {
    console.error("[auth.signup] pending_signups insert failed", pendingErr);
    return { error: "No se pudo iniciar el registro. Intentá nuevamente." };
  }

  const checkout = await startProCheckoutForPendingSignup(
    pending.id,
    plan,
    parsed.data.email,
  );
  if (checkout.error || !checkout.initPoint || !checkout.preapprovalId) {
    // Roll back the staged signup so the user can retry from scratch.
    await admin.from("pending_signups").delete().eq("id", pending.id);
    return { error: checkout.error ?? "No se pudo iniciar el pago." };
  }

  await admin
    .from("pending_signups")
    .update({ mp_preapproval_id: checkout.preapprovalId })
    .eq("id", pending.id);

  return { success: true, initPoint: checkout.initPoint };
}

export async function forgotPassword(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = { email: formData.get("email") };

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "";

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${origin}/auth/confirm?next=/reset-password`,
    }
  );

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function resetPassword(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
