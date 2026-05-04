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
import { startProCheckout, type ProPlanTier } from "@/actions/subscriptions";

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

// Signup creates the auth user up-front and, for paid plans, sends them to
// MercadoPago for the Pro checkout. Free-plan signups stop after auth user
// creation — the on_auth_user_created_subscription trigger seeds a free
// subscription row automatically. We deliberately do NOT block account
// creation on payment success: a doctor who bails mid-checkout still has a
// verified free-tier account, and the worst case is a dangling free user —
// strictly preferable to the previous "pending signup never materializes"
// failure mode where the user paid but no auth record was created.
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

  const planRaw = g("plan");
  const plan: "free" | ProPlanTier =
    planRaw === "pro_yearly"
      ? "pro_yearly"
      : planRaw === "pro_monthly"
        ? "pro_monthly"
        : "free";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  // Use the cookie-aware SSR client so signup runs in the PKCE flow. PKCE
  // is what makes Supabase send `?code=…` in the confirmation email link
  // (handled by /auth/confirm). With the plain @supabase/supabase-js client
  // we'd get the implicit flow instead, where tokens come back as URL hash
  // fragments — those never reach our server route, so the user lands on
  // /auth/auth-error even though Supabase has confirmed the account.
  const supabase = await createClient();
  const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Send the doctor through email confirmation; the dashboard route
      // welcomes them on first arrival.
      emailRedirectTo: `${appUrl}/auth/confirm?next=${encodeURIComponent("/?welcome=true")}`,
      // The on_auth_user_created trigger reads these to populate the doctor
      // row. Optional extras (firma, avatar, tagline) don't fit raw metadata,
      // so we patch them in below.
      data: {
        name: parsed.data.name ?? "",
        dni: parsed.data.dni ?? null,
        matricula: parsed.data.matricula,
        phone: parsed.data.phone,
        especialidad: parsed.data.especialidad,
      },
    },
  });

  if (signUpErr || !signUp.user) {
    if (signUpErr?.message?.toLowerCase().includes("already")) {
      return { error: "Ya existe una cuenta con ese email." };
    }
    console.error("[auth.signup] auth.signUp failed", signUpErr);
    return { error: "No se pudo crear la cuenta. Intentá nuevamente." };
  }

  const userId = signUp.user.id;

  const docUpdates: Record<string, string> = {};
  if (parsed.data.firmaDigital) docUpdates.firma_digital = parsed.data.firmaDigital;
  if (parsed.data.avatar) docUpdates.avatar = parsed.data.avatar;
  if (parsed.data.tagline) docUpdates.tagline = parsed.data.tagline;
  if (Object.keys(docUpdates).length > 0) {
    await admin.from("doctors").update(docUpdates).eq("id", userId);
  }

  // Free signups skip checkout entirely — the on_auth_user_created_subscription
  // trigger has already inserted a free subscription row, so the doctor is
  // good to go once they confirm their email.
  if (plan === "free") {
    return { success: true };
  }

  const checkout = await startProCheckout(plan, userId);
  if (checkout.error || !checkout.initPoint) {
    // The user account already exists. They can finish the upgrade later
    // from /pricing, so surface the failure but don't try to clean up.
    return {
      error:
        checkout.error ??
        "Tu cuenta fue creada pero no pudimos iniciar el pago. Probá desde Precios después de verificar tu email.",
    };
  }

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
