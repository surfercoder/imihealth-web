"use server";

import { requireAuth } from "@/utils/supabase/require-auth";
import type { PatientSearchResult } from "@/types/patient";

export async function searchPatients(query: string): Promise<{
  data?: PatientSearchResult[];
  error?: string;
}> {
  if (!query || query.trim().length < 2) return { data: [] };

  const { supabase, user } = await requireAuth();
  if (!user) return { error: "No autenticado" };

  const trimmed = query.trim();

  // Search patients by name/dni/email/phone using ilike (fast, handles partial matches well)
  const patientSearchPromise = supabase
    .from("patients")
    .select(`id, name, dni, email, phone, informes(created_at)`)
    .eq("doctor_id", user.id)
    .or(
      `name.ilike.%${trimmed}%,dni.ilike.%${trimmed}%,email.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`
    )
    .limit(10);

  // Search by report content (keyword in informe_doctor, informe_paciente)
  const reportSearchPromise = supabase
    .from("informes")
    .select(`patient_id, created_at, status, patients!inner(id, name, dni, email, phone)`)
    .eq("doctor_id", user.id)
    .or(
      `informe_doctor.ilike.%${trimmed}%,informe_paciente.ilike.%${trimmed}%`
    )
    .limit(10);

  const [patientResult, reportResult] = await Promise.all([
    patientSearchPromise,
    reportSearchPromise,
  ]);

  if (patientResult.error) {
    console.error("Patient search error:", patientResult.error);
  }
  if (reportResult.error) {
    console.error("Report search error:", reportResult.error);
  }

  const seenIds = new Set<string>();
  const results: PatientSearchResult[] = [];

  // Process patient matches
  if (patientResult.data) {
    for (const p of patientResult.data) {
      if (seenIds.has(p.id)) continue;
      seenIds.add(p.id);

      const informes = (p.informes as unknown as { created_at: string }[]) ?? [];
      const sorted = informes.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      results.push({
        id: p.id,
        name: p.name,
        dni: p.dni,
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
        dni: string | null;
        email: string | null;
        phone: string | null;
      };
      if (!patient || seenIds.has(patient.id)) continue;
      seenIds.add(patient.id);

      results.push({
        id: patient.id,
        name: patient.name,
        dni: patient.dni,
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
