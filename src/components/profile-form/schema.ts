import { z } from "zod";
import { ESPECIALIDADES } from "@/schemas/auth";

export interface DoctorProfile {
  name: string;
  email: string;
  dni: string;
  matricula: string;
  phone: string;
  especialidad: string;
  firma_digital: string | null;
  avatar: string | null;
}

export interface ProfileFormProps {
  doctor: DoctorProfile;
}

export type ProfileFormValues = {
  name: string;
  dni: string;
  matricula: string;
  phone: string;
  especialidad: string;
  firmaDigital?: string;
  avatar?: string;
};

type Translator = (key: string) => string;

export function buildProfileFormSchema(v: Translator) {
  return z.object({
    name: z.string().min(2, v("nameMin")),
    dni: z.string().refine(
      (val) => val === "" || /^\d{7,8}$/.test(val),
      { message: v("dniFormat") }
    ),
    matricula: z
      .string()
      .min(1, v("matriculaRequired"))
      .regex(/^\d+$/, v("matriculaFormat")),
    phone: z.string().min(1, v("phoneRequired")),
    especialidad: z
      .string()
      .min(1, v("specialtyRequired"))
      .refine((val) => (ESPECIALIDADES as readonly string[]).includes(val), {
        message: v("specialtyInvalid"),
      }),
    firmaDigital: z.string().optional(),
    avatar: z.string().optional(),
  });
}
