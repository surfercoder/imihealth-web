import { z } from "zod";

export const patientRowSchema = z.object({
  id: z.string().uuid(),
  doctor_id: z.string().uuid(),
  name: z.string(),
  dni: z.string().nullable(),
  dob: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  obra_social: z.string().nullable(),
  nro_afiliado: z.string().nullable(),
  plan: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const trimToNull = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return null;
    const t = v.trim();
    return t === "" ? null : t;
  });

const trimToNullEmail = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return null;
    const t = v.trim();
    return t === "" ? null : t;
  })
  .refine(
    (v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    { message: "Correo inválido" },
  );

export const patientCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(200),
  dni: trimToNull,
  dob: trimToNull,
  phone: trimToNull,
  email: trimToNullEmail,
  obra_social: trimToNull,
  nro_afiliado: trimToNull,
  plan: trimToNull,
});

export const patientUpdateSchema = patientCreateSchema;

export const patientSearchQuerySchema = z.string().trim().max(200);
