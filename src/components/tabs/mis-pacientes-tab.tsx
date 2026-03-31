"use client";

import { DashboardPatientsSection } from "@/components/dashboard-patients-section";
import type { PatientWithStats } from "@/actions/patients";
import { useTranslations } from "next-intl";

interface MisPacientesTabProps {
  patients: PatientWithStats[];
}

export function MisPacientesTab({ patients }: MisPacientesTabProps) {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {t("home.patientsTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("patients.subtitle")}
        </p>
      </div>

      <DashboardPatientsSection patients={patients} />
    </div>
  );
}
