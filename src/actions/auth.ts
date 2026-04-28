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
    firmaDigital: opt("firmaDigital"),
    avatar: opt("avatar"),
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // MVP doctor limit check
  const { count: doctorCount } = await supabase
    .from("doctors")
    .select("id", { count: "exact", head: true });
  /* v8 ignore next */
  if ((doctorCount ?? 0) >= MVP_LIMITS.MAX_DOCTORS) {
    return { error: `Hemos alcanzado el límite de ${MVP_LIMITS.MAX_DOCTORS} médicos para la fase de prueba MVP.` };
  }
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "";

  const { data: signUpData, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/?welcome=true")}`,
      data: {
        name: parsed.data.name ?? "",
        dni: parsed.data.dni,
        matricula: parsed.data.matricula,
        phone: parsed.data.phone,
        especialidad: parsed.data.especialidad,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (
    signUpData?.user &&
    (parsed.data.firmaDigital || parsed.data.avatar)
  ) {
    const admin = createAdminClient();
    const updates: Record<string, string> = {};
    if (parsed.data.firmaDigital) {
      updates.firma_digital = parsed.data.firmaDigital;
    }
    if (parsed.data.avatar) {
      updates.avatar = parsed.data.avatar;
    }
    await admin
      .from("doctors")
      .update(updates)
      .eq("id", signUpData.user.id);
  }

  return { success: true };
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
