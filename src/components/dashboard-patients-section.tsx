"use client";

import { useState, useCallback, useRef, Suspense } from "react";
import { PatientSearch } from "@/components/patient-search";
import { PatientsList } from "@/components/patients-list";
import type { PatientWithStats } from "@/actions/patients";
import { searchPatients } from "@/actions/patients";

interface DashboardPatientsSectionProps {
  patients: PatientWithStats[];
}

export function DashboardPatientsSection({ patients }: DashboardPatientsSectionProps) {
  const [searchResults, setSearchResults] = useState<PatientWithStats[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(0);

  const handleSearchChange = useCallback((query: string) => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    const searchId = ++searchRef.current;
    setIsSearching(true);
    setSearchResults(null);

    searchPatients(trimmed)
      .then((result) => {
        if (searchRef.current !== searchId) return;
        if (result.data) {
          const mapped: PatientWithStats[] = result.data.map((r) => ({
            id: r.id,
            name: r.name,
            dni: r.dni,
            email: r.email,
            phone: r.phone,
            dob: "",
            obra_social: null,
            nro_afiliado: null,
            plan: null,
            created_at: "",
            informe_count: r.informe_count,
            last_informe_at: r.last_informe_at,
            last_informe_status: null,
          }));
          setSearchResults(mapped);
        } else {
          setSearchResults([]);
        }
        setIsSearching(false);
      })
      .catch(() => {
        /* v8 ignore next */
        if (searchRef.current !== searchId) return;
        setSearchResults([]);
        setIsSearching(false);
      });
  }, []);

  const displayedPatients = searchResults ?? patients;

  return (
    <div className="space-y-4">
      <Suspense fallback={<div className="h-10" />}>
        <PatientSearch
          onSearchChange={handleSearchChange}
        />
      </Suspense>
      <Suspense fallback={<PatientsList patients={displayedPatients} isLoading={true} />}>
        <PatientsList
          patients={displayedPatients}
          isLoading={isSearching}
        />
      </Suspense>
    </div>
  );
}
