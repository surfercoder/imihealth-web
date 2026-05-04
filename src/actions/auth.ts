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
import {
  startProCheckoutForPendingSignup,
  type ProPlanTier,
} from "@/actions/subscriptions";
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

// Free signups create the auth user (and, via DB triggers, the doctor +
// free subscription) up-front, then Supabase sends the confirmation email.
//
// Pro signups are deferred: nothing real exists until MercadoPago confirms
// payment. We stage the form into pending_signups (password encrypted at
// rest) and hand the user off to MP. The MP webhook — and /billing/return
// as a backup path — runs reconcilePreapproval → materializePendingSignup
// on `authorized`, which calls supabase.auth.signUp() (creating the
// doctor + subscription via triggers) and triggers the confirmation email.
// A doctor who abandons checkout never gets an auth record or an email.
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

  if (plan === "free") {
    return signupFree(parsed.data, admin);
  }

  return signupPro(parsed.data, plan, admin);
}

type SignupParsed = {
  name?: string;
  email: string;
  password: string;
  dni?: string;
  matricula: string;
  phone: string;
  especialidad: string;
  tagline?: string;
  firmaDigital?: string;
  avatar?: string;
};

async function signupFree(
  data: SignupParsed,
  admin: ReturnType<typeof createAdminClient>,
): Promise<ActionResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  // Use the cookie-aware SSR client so signup runs in the PKCE flow. PKCE
  // is what makes Supabase send `?code=…` in the confirmation email link
  // (handled by /auth/confirm). With the plain @supabase/supabase-js client
  // we'd get the implicit flow instead, where tokens come back as URL hash
  // fragments — those never reach our server route, so the user lands on
  // /auth/auth-error even though Supabase has confirmed the account.
  const supabase = await createClient();
  const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${appUrl}/auth/confirm?next=${encodeURIComponent("/?welcome=true")}`,
      // The on_auth_user_created trigger reads these to populate the doctor
      // row. Optional extras (firma, avatar, tagline) don't fit raw metadata,
      // so we patch them in below.
      data: {
        name: data.name ?? "",
        dni: data.dni ?? null,
        matricula: data.matricula,
        phone: data.phone,
        especialidad: data.especialidad,
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
  if (data.firmaDigital) docUpdates.firma_digital = data.firmaDigital;
  if (data.avatar) docUpdates.avatar = data.avatar;
  if (data.tagline) docUpdates.tagline = data.tagline;
  if (Object.keys(docUpdates).length > 0) {
    await admin.from("doctors").update(docUpdates).eq("id", userId);
  }

  return { success: true };
}

async function signupPro(
  data: SignupParsed,
  plan: ProPlanTier,
  admin: ReturnType<typeof createAdminClient>,
): Promise<ActionResult> {
  // Reject if email already maps to a real account; replace any abandoned
  // pending row for the same email so the user can retry without a 23505.
  const { data: existingDoctor } = await admin
    .from("doctors")
    .select("id")
    .eq("email", data.email)
    .maybeSingle();
  if (existingDoctor) {
    return { error: "Ya existe una cuenta con ese email." };
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
    console.error("[auth.signup] pending_signups insert failed", pendingErr);
    return { error: "No se pudo iniciar el registro. Intentá nuevamente." };
  }

  const checkout = await startProCheckoutForPendingSignup(pending.id, plan);
  if (checkout.error || !checkout.initPoint) {
    // Roll back the staged signup so the user can retry from scratch.
    await admin.from("pending_signups").delete().eq("id", pending.id);
    return { error: checkout.error ?? "No se pudo iniciar el pago." };
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
