import { z } from "zod";

export const enterpriseLeadRowSchema = z.object({
  id: z.string().uuid(),
  company_name: z.string(),
  contact_name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
});

export const enterpriseLeadCreateSchema = z.object({
  companyName: z.string().trim().min(1, "El nombre de la empresa es requerido").max(200),
  contactName: z.string().trim().min(1, "El nombre del contacto es requerido").max(200),
  email: z.string().trim().email("Correo inválido").max(200),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
