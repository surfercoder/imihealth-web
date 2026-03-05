import { z } from "zod";

export const ESPECIALIDADES = [
  "Alergología",
  "Anestesiología y reanimación",
  "Cardiología",
  "Dermatología",
  "Endocrinología y nutrición",
  "Geriatría",
  "Hematología y hemoterapia",
  "Inmunología",
  "Infectología",
  "Medicina interna",
  "Medicina familiar y comunitaria",
  "Medicina del trabajo",
  "Medicina preventiva y salud pública",
  "Medicina crítica / intensiva",
  "Neumología",
  "Nefrología",
  "Neurología",
  "Oncología médica",
  "Psiquiatría",
  "Pediatría",
  "Reumatología",
  "Cirugía general y del aparato digestivo",
  "Cirugía cardiovascular",
  "Cirugía torácica",
  "Cirugía ortopédica y traumatología",
  "Cirugía pediátrica",
  "Cirugía plástica, estética y reparadora",
  "Cirugía oral y maxilofacial",
  "Neurocirugía",
  "Angiología y cirugía vascular",
  "Dermatología médico-quirúrgica y venereología",
  "Obstetricia y ginecología",
  "Oftalmología",
  "Otorrinolaringología",
  "Urología",
  "Anatomía patológica",
  "Bioquímica clínica",
  "Farmacología clínica",
  "Microbiología y parasitología",
  "Medicina nuclear",
  "Neurofisiología clínica",
  "Radiodiagnóstico",
  "Medicina transfusional y hemoterapia",
  "Medicina del deporte / medicina física y rehabilitación",
  "Medicina legal y forense",
  "Medicina paliativa",
  "Medicina aeroespacial / medicina aeronáutica",
  "Hidrología médica",
] as const;

export type Especialidad = (typeof ESPECIALIDADES)[number];

export type ValidationMessages = {
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
  passwordMin: string;
  confirmPasswordRequired: string;
  passwordsMismatch: string;
  nameMin: string;
  dniRequired: string;
  dniFormat: string;
  matriculaRequired: string;
  matriculaFormat: string;
  phoneRequired: string;
  phoneInvalid: string;
  specialtyRequired: string;
  specialtyInvalid: string;
};

export const defaultMessages: ValidationMessages = {
  emailRequired: "El correo es requerido",
  emailInvalid: "Correo inválido",
  passwordRequired: "La contraseña es requerida",
  passwordMin: "La contraseña debe tener al menos 8 caracteres",
  confirmPasswordRequired: "Confirmá tu contraseña",
  passwordsMismatch: "Las contraseñas no coinciden",
  nameMin: "El nombre es requerido",
  dniRequired: "El DNI es requerido",
  dniFormat: "El DNI debe tener 7 u 8 dígitos numéricos",
  matriculaRequired: "La matrícula es requerida",
  matriculaFormat: "La matrícula debe contener solo números",
  phoneRequired: "El teléfono es requerido",
  phoneInvalid: "Teléfono inválido",
  specialtyRequired: "La especialidad es requerida",
  specialtyInvalid: "Seleccioná una especialidad válida",
};

export function createLoginSchema(m: ValidationMessages = defaultMessages) {
  return z.object({
    email: z.string().min(1, m.emailRequired).email(m.emailInvalid),
    password: z.string().min(1, m.passwordRequired),
  });
}

export function createSignupSchema(m: ValidationMessages = defaultMessages) {
  return z
    .object({
      name: z.string().min(2, m.nameMin).optional(),
      email: z.string().min(1, m.emailRequired).email(m.emailInvalid),
      password: z.string().min(8, m.passwordMin),
      confirmPassword: z.string().min(1, m.confirmPasswordRequired),
      dni: z
        .string()
        .min(1, m.dniRequired)
        .regex(/^\d{7,8}$/, m.dniFormat)
        .optional(),
      matricula: z
        .string()
        .min(1, m.matriculaRequired)
        .regex(/^\d+$/, m.matriculaFormat),
      phone: z
        .string()
        .min(1, m.phoneRequired)
        .regex(/^\+?[\d\s\-().]{7,20}$/, m.phoneInvalid),
      especialidad: z
        .string()
        .min(1, m.specialtyRequired)
        .refine((val) => (ESPECIALIDADES as readonly string[]).includes(val), {
          message: m.specialtyInvalid,
        }),
      firmaDigital: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: m.passwordsMismatch,
      path: ["confirmPassword"],
    });
}

export function createForgotPasswordSchema(m: ValidationMessages = defaultMessages) {
  return z.object({
    email: z.string().min(1, m.emailRequired).email(m.emailInvalid),
  });
}

export function createResetPasswordSchema(m: ValidationMessages = defaultMessages) {
  return z
    .object({
      password: z.string().min(8, m.passwordMin),
      confirmPassword: z.string().min(1, m.confirmPasswordRequired),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: m.passwordsMismatch,
      path: ["confirmPassword"],
    });
}

export const loginSchema = createLoginSchema();
export const signupSchema = createSignupSchema();
export const forgotPasswordSchema = createForgotPasswordSchema();
export const resetPasswordSchema = createResetPasswordSchema();
