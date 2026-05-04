import { z } from "zod";

export const informeRapidoStatusSchema = z.enum([
  "processing",
  "completed",
  "error",
]);

export const informeRapidoRowSchema = z.object({
  id: z.string().uuid(),
  doctor_id: z.string().uuid(),
  status: informeRapidoStatusSchema,
  informe_doctor: z.string().nullable(),
  recording_duration: z.number().int().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const informeRapidoUpdateDoctorSchema = z.object({
  informe_doctor: z.string(),
});

export const processQuickInformeInputSchema = z.object({
  browserTranscript: z.string(),
  audioPath: z.string().optional(),
  language: z.string().default("es"),
  recordingDuration: z.number().int().nonnegative().optional(),
});
