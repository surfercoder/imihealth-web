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
  informTypes: { type: string; count: number; fill: string }[];
  summary: {
    totalPatients: number;
    completedCount: number;
    processingCount: number;
    errorCount: number;
  };
}

export async function getDashboardChartData(
  userId: string
): Promise<ChartData | null> {
  const supabase = await createClient();

  const [{ data: patients }, { data: informes }, { data: generationLog }] =
    await Promise.all([
      supabase
        .from("patients")
        .select("id, created_at")
        .eq("doctor_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("informes")
        .select(
          "id, created_at, updated_at, status, informe_doctor, recording_duration"
        )
        .eq("doctor_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("inform_generation_log")
        .select("inform_type")
        .eq("doctor_id", userId),
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

  // 2. Consultation time (actual recording duration for completed informes)
  const completedInformes = allInformes.filter((i) => i.status === "completed");
  const durations: { date: string; minutes: number }[] = [];

  for (const inf of completedInformes) {
    let mins: number;
    if (inf.recording_duration != null) {
      // Use actual recording duration (stored in seconds)
      mins = inf.recording_duration / 60;
    } else {
      // Fallback for old records without recording_duration
      const created = new Date(inf.created_at).getTime();
      const updated = new Date(inf.updated_at).getTime();
      mins = (updated - created) / 60000;
    }
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

  // 4. Inform types (classic vs quick) — from immutable generation log
  const allLog = generationLog ?? [];
  const classicCount = allLog.filter((l) => l.inform_type === "classic").length;
  const quickCount = allLog.filter((l) => l.inform_type === "quick").length;
  const informTypes = [
    { type: "classic", count: classicCount, fill: "var(--color-classic)" },
    { type: "quick", count: quickCount, fill: "var(--color-quick)" },
  ];

  return {
    patientsOverTime,
    consultationTime,
    patientsAccumulator: { current: dailyEntries, average: avgPerDay },
    informTypes,
    summary: {
      totalPatients: allPatients.length,
      completedCount: completedInformes.length,
      processingCount: allInformes.filter((i) => i.status === "processing")
        .length,
      errorCount: allInformes.filter((i) => i.status === "error").length,
    },
  };
}
