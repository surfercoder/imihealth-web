"use client";

import { Suspense } from "react";
import {
  PatientSearchContent,
  type PatientSearchProps,
} from "./patient-search/patient-search-content";

export function PatientSearch(props: PatientSearchProps) {
  return (
    <Suspense fallback={null}>
      <PatientSearchContent {...props} />
    </Suspense>
  );
}
