"use client";

import { useTranslations } from "next-intl";
import type { PatientSearchResult } from "@/actions/patients";
import { PatientSearchResultItem } from "./patient-search-result-item";

interface PatientSearchResultsProps {
  query: string;
  results: PatientSearchResult[];
  activeIndex: number;
  onSelect: (patient: PatientSearchResult) => void;
  onHover: (index: number) => void;
}

export function PatientSearchResults({
  query,
  results,
  activeIndex,
  onSelect,
  onHover,
}: PatientSearchResultsProps) {
  const t = useTranslations("patientSearch");

  return (
    <div
      id="patient-search-results"
      role="listbox"
      className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-80 overflow-y-auto"
    >
      {results.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground">
          <p>{t("noResults", { query })}</p>
          <p className="text-xs mt-1">{t("noResultsHint")}</p>
        </div>
      ) : (
        results.map((patient, index) => (
          <PatientSearchResultItem
            key={patient.id}
            patient={patient}
            index={index}
            activeIndex={activeIndex}
            onSelect={onSelect}
            onHover={onHover}
          />
        ))
      )}
    </div>
  );
}
