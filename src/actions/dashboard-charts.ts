"use server";

import { createClient } from "@/utils/supabase/server";

export interface ChartData {
  patientsOverTime: { date: string; total: number }[];
  consultationTime: {
    avg: number;
    min: number;
    max: number;
    data: { date: string; minutes: number }[];
  };
  patientsAccumulator: {
    current: { date: string; patients: number }[];
    average: number;
  };
  consultationReasons: { reason: string; count: number }[];
}

export async function getDashboardChartData(): Promise<ChartData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: patients }, { data: informes }] = await Promise.all([
    supabase
      .from("patients")
      .select("id, created_at")
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("informes")
      .select("id, created_at, updated_at, status, informe_doctor")
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const allPatients = patients ?? [];
  const allInformes = informes ?? [];

  // 1. Patients over time (cumulative by date)
  const patientsByDate = new Map<string, number>();
  let cumulative = 0;
  for (const p of allPatients) {
    const date = new Date(p.created_at).toISOString().split("T")[0];
    cumulative++;
    patientsByDate.set(date, cumulative);
  }
  const patientsOverTime = Array.from(patientsByDate.entries()).map(
    ([date, total]) => ({ date, total })
  );

  // 2. Consultation time (processing time for completed informes)
  const completedInformes = allInformes.filter((i) => i.status === "completed");
  const durations: { date: string; minutes: number }[] = [];

  for (const inf of completedInformes) {
    const created = new Date(inf.created_at).getTime();
    const updated = new Date(inf.updated_at).getTime();
    const mins = (updated - created) / 60000;
    // Filter reasonable durations (under 60 min — longer ones are later edits)
    if (mins > 0 && mins < 60) {
      durations.push({
        date: new Date(inf.created_at).toISOString().split("T")[0],
        minutes: Math.round(mins * 10) / 10,
      });
    }
  }

  const durationValues = durations.map((d) => d.minutes);
  const consultationTime = {
    avg:
      durationValues.length > 0
        ? Math.round(
            (durationValues.reduce((a, b) => a + b, 0) / durationValues.length) *
              10
          ) / 10
        : 0,
    min: durationValues.length > 0 ? Math.min(...durationValues) : 0,
    max: durationValues.length > 0 ? Math.max(...durationValues) : 0,
    data: durations,
  };

  // 3. Patients accumulator by day (daily new patients + comparison to average)
  const dailyCounts = new Map<string, number>();
  for (const p of allPatients) {
    const date = new Date(p.created_at).toISOString().split("T")[0];
    dailyCounts.set(date, (dailyCounts.get(date) ?? 0) + 1);
  }
  const dailyEntries = Array.from(dailyCounts.entries()).map(
    ([date, patients]) => ({ date, patients })
  );
  const avgPerDay =
    dailyEntries.length > 0
      ? Math.round(
          (dailyEntries.reduce((a, b) => a + b.patients, 0) /
            dailyEntries.length) *
            10
        ) / 10
      : 0;

  // 4. Consultation reasons (extracted from informe_doctor)
  const reasonCounts = new Map<string, number>();
  for (const inf of allInformes) {
    if (!inf.informe_doctor) continue;
    const match = inf.informe_doctor.match(
      /MOTIVO DE CONSULTA:\s*\n([\s\S]+?)(?:\n\n|\nANAMNESIS|\nEXAMEN|\nEXPLORACIÓN)/
    );
    if (match) {
      let reason = match[1].trim();
      // Clean up and normalize
      reason = reason
        .replace(/^Paciente (femenina |masculino )?que /i, "")
        .replace(/^No disponible.*$/i, "Transcripción no disponible")
        .replace(
          /^No disponible.*$/i,
          "Transcripción no disponible"
        );

      // Categorize by keywords for cleaner grouping
      let category = reason;
      const lower = reason.toLowerCase();
      if (
        lower.includes("codo") ||
        lower.includes("epicondilitis") ||
        lower.includes("tenista")
      ) {
        category = "Dolor de codo";
      } else if (lower.includes("tobillo")) {
        category = "Traumatismo de tobillo";
      } else if (lower.includes("hombro")) {
        category = "Dolor de hombro";
      } else if (lower.includes("mano") || lower.includes("dedo")) {
        category = "Traumatismo de mano/dedo";
      } else if (lower.includes("muñeca")) {
        category = "Traumatismo de muñeca";
      } else if (lower.includes("rodilla")) {
        category = "Traumatismo de rodilla";
      } else if (lower.includes("costal") || lower.includes("dorsal")) {
        category = "Contusión costal/dorsal";
      } else if (
        lower.includes("no disponible") ||
        lower.includes("error") ||
        lower.includes("no fue posible")
      ) {
        category = "Sin datos";
      }

      reasonCounts.set(category, (reasonCounts.get(category) ?? 0) + 1);
    }
  }

  const consultationReasons = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  return {
    patientsOverTime,
    consultationTime,
    patientsAccumulator: { current: dailyEntries, average: avgPerDay },
    consultationReasons,
  };
}
