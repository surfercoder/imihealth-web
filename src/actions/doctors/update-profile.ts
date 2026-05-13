"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/utils/supabase/require-auth";
import { doctorProfileUpdateSchema } from "@/schemas/doctor";

type ProfileResult = {
  error?: string;
  success?: boolean;
};

export async function updateProfile(
  _prevState: ProfileResult | null,
  formData: FormData,
): Promise<ProfileResult> {
  const raw = {
    name: formData.get("name") ?? "",
    dni: formData.get("dni") ?? "",
    matricula: formData.get("matricula") ?? "",
    phone: formData.get("phone") ?? "",
    especialidad: formData.get("especialidad") ?? "",
    tagline: formData.get("tagline") ?? "",
    firmaDigital: formData.get("firmaDigital") ?? undefined,
    avatar: formData.get("avatar") ?? undefined,
  };

  const parsed = doctorProfileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await requireAuth();
  if (!user) return { error: "Not authenticated" };

  const updateData: Record<string, string | null> = {
    /* v8 ignore next */
    name: parsed.data.name ?? "",
    dni: parsed.data.dni || "",
    matricula: parsed.data.matricula,
    phone: parsed.data.phone,
    especialidad: parsed.data.especialidad,
    tagline: parsed.data.tagline.trim() || null,
  };

  if (parsed.data.firmaDigital !== undefined) {
    updateData.firma_digital = parsed.data.firmaDigital || null;
  }

  if (parsed.data.avatar !== undefined) {
    updateData.avatar = parsed.data.avatar || null;
  }

  const { error } = await supabase
    .from("doctors")
    .update(updateData)
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/profile");
  return { success: true };
}
