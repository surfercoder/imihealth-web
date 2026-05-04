import { z } from "zod";

export const informeStatusSchema = z.enum([
  "recording",
  "processing",
  "completed",
  "error",
]);

export const informeRowSchema = z.object({
  id: z.string().uuid(),
  doctor_id: z.string().uuid(),
  patient_id: z.string().uuid().nullable(),
  status: informeStatusSchema,
  informe_doctor: z.string().nullable(),
  informe_paciente: z.string().nullable(),
  recording_duration: z.number().int().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const informeCreateSchema = z.object({
  patient_id: z.string().uuid(),
});

export const informeUpdateReportsSchema = z.object({
  informe_doctor: z.string(),
  informe_paciente: z.string(),
});

export const informeUpdateDoctorSchema = z.object({
  informe_doctor: z.string(),
});

export const informeUpdatePacienteSchema = z.object({
  informe_paciente: z.string(),
});

export const generatePedidosSchema = z.object({
  informeId: z.string().uuid(),
  items: z.array(z.string().trim().min(1)).min(1, "No hay pedidos para generar"),
});

export const generatePatientPedidosSchema = z.object({
  patientId: z.string().uuid(),
  items: z.array(z.string().trim().min(1)).min(1, "No hay pedidos para generar"),
  diagnostico: z.string().nullable(),
});

export const certificadoOptionsSchema = z.object({
  daysOff: z.number().int().nullable().optional(),
  diagnosis: z.string().nullable().optional(),
  observations: z.string().nullable().optional(),
});
