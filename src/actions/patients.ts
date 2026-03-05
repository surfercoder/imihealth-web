"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface PatientWithStats {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  dob: string;
  created_at: string;
  informe_count: number;
  last_informe_at: string | null;
  last_informe_status: string | null;
}

export interface PatientSearchResult {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  informe_count: number;
  last_informe_at: string | null;
  match_type: "patient" | "report";
}

export async function searchPatients(query: string): Promise<{
  data?: PatientSearchResult[];
  error?: string;
}> {
  if (!query || query.trim().length < 2) return { data: [] };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const trimmed = query.trim();

  // Search patients by name/email/phone using ilike (fast, handles partial matches well)
  const patientSearchPromise = supabase
    .from("patients")
    .select(`id, name, email, phone, informes(count, created_at, status)`)
    .eq("doctor_id", user.id)
    .or(
      `name.ilike.%${trimmed}%,email.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`
    )
    .limit(10);

  // Search by report content (keyword in informe_doctor, informe_paciente, transcript)
  const reportSearchPromise = supabase
    .from("informes")
    .select(`patient_id, created_at, status, patients!inner(id, name, email, phone)`)
    .eq("doctor_id", user.id)
    .or(
      `informe_doctor.ilike.%${trimmed}%,informe_paciente.ilike.%${trimmed}%,transcript.ilike.%${trimmed}%`
    )
    .limit(10);

  const [patientResult, reportResult] = await Promise.all([
    patientSearchPromise,
    reportSearchPromise,
  ]);

  const seenIds = new Set<string>();
  const results: PatientSearchResult[] = [];

  // Process patient matches
  if (patientResult.data) {
    for (const p of patientResult.data) {
      if (seenIds.has(p.id)) continue;
      seenIds.add(p.id);

      const informes = (p.informes as unknown as { created_at: string; status: string }[]) ?? [];
      const sorted = informes.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      results.push({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        informe_count: informes.length,
        last_informe_at: sorted[0]?.created_at ?? null,
        match_type: "patient",
      });
    }
  }

  // Process report keyword matches — add patient if not already found
  if (reportResult.data) {
    for (const informe of reportResult.data) {
      const patient = informe.patients as unknown as {
        id: string;
        name: string;
        email: string | null;
        phone: string;
      };
      if (!patient || seenIds.has(patient.id)) continue;
      seenIds.add(patient.id);

      results.push({
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        informe_count: 0,
        last_informe_at: informe.created_at,
        match_type: "report",
      });
    }
  }

  return { data: results };
}

export async function getPatients(): Promise<{
  data?: PatientWithStats[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data, error } = await supabase
    .from("patients")
    .select(`id, name, email, phone, dob, created_at, informes(created_at, status)`)
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
      email: p.email,
      phone: p.phone,
      dob: p.dob,
      created_at: p.created_at,
      informe_count: informes.length,
      last_informe_at: sorted[0]?.created_at ?? null,
      last_informe_status: sorted[0]?.status ?? null,
    };
  });

  return { data: patients };
}

export async function getPatient(patientId: string): Promise<{
  data?: {
    id: string;
    name: string;
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
      `id, name, email, phone, dob, created_at,
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
      email: data.email,
      phone: data.phone,
      dob: data.dob,
      created_at: data.created_at,
      informes,
    },
  };
}

export async function updatePatient(
  patientId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const name = formData.get("name") as string;
  const dob = formData.get("dob") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;

  const { error } = await supabase
    .from("patients")
    .update({
      name: name.trim(),
      dob: dob || undefined,
      phone: phone.trim(),
      email: email?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", patientId)
    .eq("doctor_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/");
  return {};
}
