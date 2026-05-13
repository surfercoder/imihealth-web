"use server";

import { requireAuth } from "@/utils/supabase/require-auth";
import type { PatientWithStats } from "@/types/patient";

export async function getPatients(): Promise<{
  data?: PatientWithStats[];
  error?: string;
}> {
  const { supabase, user } = await requireAuth();
  if (!user) return { error: "No autenticado" };

  const { data, error } = await supabase
    .from("patients")
    .select(`id, name, dni, email, phone, dob, obra_social, nro_afiliado, plan, created_at, informes(created_at, status)`)
    .eq("doctor_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return { error: error.message };

  const patients: PatientWithStats[] = (data ?? []).map((p) => {
    const informes = (p.informes as unknown as { created_at: string; status: string }[]) ?? [];
    const sorted = informes.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return {
      id: p.id,
      name: p.name,
      dni: p.dni,
      email: p.email,
      phone: p.phone,
      dob: p.dob,
      obra_social: p.obra_social,
      nro_afiliado: p.nro_afiliado,
      plan: p.plan,
      created_at: p.created_at,
      informe_count: informes.length,
      last_informe_at: sorted[0]?.created_at ?? null,
      last_informe_status: sorted[0]?.status ?? null,
    };
  });

  return { data: patients };
}
