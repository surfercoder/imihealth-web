import { z } from "zod";
import {
  patientRowSchema,
  patientCreateSchema,
  patientUpdateSchema,
} from "@/schemas/patient";

export type Patient = z.infer<typeof patientRowSchema>;
export type PatientCreateInput = z.infer<typeof patientCreateSchema>;
export type PatientUpdateInput = z.infer<typeof patientUpdateSchema>;

export interface PatientWithStats {
  id: string;
  name: string;
  dni: string | null;
  email: string | null;
  phone: string | null;
  dob: string | null;
  obra_social: string | null;
  nro_afiliado: string | null;
  plan: string | null;
  created_at: string;
  informe_count: number;
  last_informe_at: string | null;
  last_informe_status: string | null;
}

export interface PatientSearchResult {
  id: string;
  name: string;
  dni: string | null;
  email: string | null;
  phone: string | null;
  informe_count: number;
  last_informe_at: string | null;
  match_type: "patient" | "report";
}
