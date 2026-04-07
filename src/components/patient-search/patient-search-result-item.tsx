"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { PatientSearchResult } from "@/actions/patients";

interface PatientSearchResultItemProps {
  patient: PatientSearchResult;
  index: number;
  activeIndex: number;
  onSelect: (patient: PatientSearchResult) => void;
  onHover: (index: number) => void;
}

export function PatientSearchResultItem({
  patient,
  index,
  activeIndex,
  onSelect,
  onHover,
}: PatientSearchResultItemProps) {
  const t = useTranslations("patientSearch");
  const isActive = index === activeIndex;

  return (
    <div role="option" aria-selected={isActive}>
      <button
        type="button"
        className={cn(
          "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
          isActive && "bg-muted"
        )}
        onClick={() => onSelect(patient)}
        onMouseEnter={() => onHover(index)}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium">{patient.name}</span>
            {patient.match_type === "report" && (
              <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                {t("inReport")}
              </span>
            )}
          </div>
          {patient.informe_count > 0 && (
            <span className="text-xs text-muted-foreground">
              {patient.informe_count} {patient.informe_count === 1 ? t("report") : t("reports")}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{patient.phone}</div>
      </button>
    </div>
  );
}
