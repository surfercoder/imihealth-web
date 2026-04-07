"use server";

import { createClient } from "@/utils/supabase/server";

export async function getPatient(patientId: string): Promise<{
  data?: {
    id: string;
    name: string;
    dni: string;
    email: string | null;
    phone: string;
    dob: string;
    created_at: string;
    informes: {
      id: string;
      status: string;
      created_at: string;
      informe_doctor: string | null;
      informe_paciente: string | null;
    }[];
  };
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data, error } = await supabase
    .from("patients")
    .select(
      `id, name, dni, email, phone, dob, created_at,
       informes(id, status, created_at, informe_doctor, informe_paciente)`
    )
    .eq("id", patientId)
    .eq("doctor_id", user.id)
    .single();

  if (error) return { error: error.message };

  const informes = (
    data.informes as unknown as {
      id: string;
      status: string;
      created_at: string;
      informe_doctor: string | null;
      informe_paciente: string | null;
    }[]
  ).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return {
    data: {
      id: data.id,
      name: data.name,
      dni: data.dni,
      email: data.email,
      phone: data.phone,
      dob: data.dob,
      created_at: data.created_at,
      informes,
    },
  };
}
