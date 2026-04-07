export interface PatientWithStats {
  id: string;
  name: string;
  dni: string;
  email: string | null;
  phone: string;
  dob: string;
  created_at: string;
  informe_count: number;
  last_informe_at: string | null;
  last_informe_status: string | null;
}

export interface PatientSearchResult {
  id: string;
  name: string;
  dni: string;
  email: string | null;
  phone: string;
  informe_count: number;
  last_informe_at: string | null;
  match_type: "patient" | "report";
}
