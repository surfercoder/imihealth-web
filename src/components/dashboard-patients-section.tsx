"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PatientsList } from "@/components/patients-list";
import type { PatientWithStats } from "@/actions/patients";
import { useTranslations } from "next-intl";

interface DashboardPatientsSectionProps {
  patients: PatientWithStats[];
}

export function DashboardPatientsSection({ patients }: DashboardPatientsSectionProps) {
  const [query, setQuery] = useState("");
  const t = useTranslations("patientsList");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => {
      const name = p.name?.toLowerCase() ?? "";
      const dni = p.dni?.toLowerCase() ?? "";
      const phone = p.phone?.toLowerCase() ?? "";
      const email = p.email?.toLowerCase() ?? "";
      return name.includes(q) || dni.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [query, patients]);

  return (
    <div className="space-y-4">
      {patients.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9 pr-9 bg-card border-border text-card-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}
      <PatientsList
        patients={filtered}
        searchQuery={query}
        noSearchResultsLabel={t("noSearchResults")}
      />
    </div>
  );
}
