"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { ESPECIALIDADES } from "@/schemas/auth";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(2).optional(),
  dni: z.string().regex(/^\d{7,8}$/).optional().or(z.literal("")),
  matricula: z.string().min(1).regex(/^\d+$/),
  phone: z.string().min(1),
  especialidad: z
    .string()
    .min(1)
    .refine((val) => (ESPECIALIDADES as readonly string[]).includes(val)),
  tagline: z.string().max(200),
  firmaDigital: z.string().optional(),
  avatar: z.string().optional(),
});

type ProfileResult = {
  error?: string;
  success?: boolean;
};

export async function updateProfile(
  _prevState: ProfileResult | null,
  formData: FormData
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

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

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

export async function getDoctorProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: doctor } = await supabase
    .from("doctors")
    .select("name, email, dni, matricula, phone, especialidad, tagline, firma_digital")
    .eq("id", user.id)
    .single();

  return doctor;
}
