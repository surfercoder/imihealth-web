import { z } from "zod";
import { ESPECIALIDADES } from "@/schemas/auth";

export const doctorRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  dni: z.string().nullable(),
  matricula: z.string(),
  phone: z.string(),
  especialidad: z.string(),
  tagline: z.string().nullable(),
  firma_digital: z.string().nullable(),
  avatar: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const doctorProfileUpdateSchema = z.object({
  name: z.string().trim().min(2, "El nombre es requerido").optional(),
  dni: z
    .string()
    .trim()
    .regex(/^\d{7,8}$/, "El DNI debe tener 7 u 8 dígitos numéricos")
    .optional()
    .or(z.literal("")),
  matricula: z
    .string()
    .trim()
    .min(1, "La matrícula es requerida")
    .regex(/^\d+$/, "La matrícula debe contener solo números"),
  phone: z.string().trim().min(1, "El teléfono es requerido"),
  especialidad: z
    .string()
    .trim()
    .min(1, "La especialidad es requerida")
    .refine(
      (val) => (ESPECIALIDADES as readonly string[]).includes(val),
      { message: "Seleccioná una especialidad válida" },
    ),
  tagline: z.string().max(200, "El subtítulo no puede superar los 200 caracteres"),
  firmaDigital: z.string().optional(),
  avatar: z.string().optional(),
});
