"use client";

import Link from "next/link";
import { User, Phone, FileText, Clock, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PatientWithStats } from "@/actions/patients";
import { useTranslations, useLocale } from "next-intl";
import { DeletePatientButton } from "@/components/delete-patient-button";

interface PatientsListProps {
  patients: PatientWithStats[];
  searchQuery?: string;
  isLoading?: boolean;
}

const statusColors: Record<string, string> = {
  completed: "text-emerald-600",
  processing: "text-primary",
  recording: "text-destructive",
  error: "text-destructive",
};

export function PatientsList({ patients, isLoading }: PatientsListProps) {
  const t = useTranslations("patientsList");
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center shadow-sm">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
          <Users className="size-7" />
        </div>
        <p className="font-medium text-card-foreground">{t("empty")}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("emptyHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {patients.map((patient) => {
        const lastDate = patient.last_informe_at
          ? new Date(patient.last_informe_at).toLocaleDateString(locale === "en" ? "en-US" : "es-AR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : null;

        const statusColor = patient.last_informe_status
          ? statusColors[patient.last_informe_status] ?? "text-muted-foreground"
          : "text-muted-foreground";

        return (
          <div
            key={patient.id}
            className="group relative flex items-center gap-4 rounded-xl border bg-card px-5 py-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
          >
            <Link href={`/patients/${patient.id}`} className="absolute inset-0 rounded-xl" aria-label={patient.name} />

            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary relative z-10 pointer-events-none">
              <User className="size-5" />
            </div>

            <div className="flex-1 min-w-0 relative z-10 pointer-events-none">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium truncate text-card-foreground">{patient.name}</p>
                {patient.informe_count > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-xs font-medium shrink-0">
                    <FileText className="size-3" />
                    {patient.informe_count}{" "}
                    {patient.informe_count === 1 ? t("report") : t("reports")}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Phone className="size-3" />
                  {patient.phone}
                </span>
                {lastDate && (
                  <span className={cn("flex items-center gap-1", statusColor)}>
                    <Clock className="size-3" />
                    {t("lastConsult")} {lastDate}
                  </span>
                )}
              </div>
            </div>

            <div className="relative z-20 pointer-events-auto">
              <DeletePatientButton patientId={patient.id} patientName={patient.name} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
