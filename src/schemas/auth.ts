import { z } from "zod";

const STRONG_PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|<>?,./`~]).{8,}$/;

export const ESPECIALIDADES = [
  "Alergología",
  "Anatomía patológica",
  "Anestesiología y reanimación",
  "Angiología y cirugía vascular",
  "Bioquímica clínica",
  "Cardiología",
  "Cirugía cardiovascular",
  "Cirugía general y del aparato digestivo",
  "Cirugía oral y maxilofacial",
  "Cirugía ortopédica y traumatología",
  "Cirugía pediátrica",
  "Cirugía plástica, estética y reparadora",
  "Cirugía torácica",
  "Dermatología médico-quirúrgica y venereología",
  "Dermatología",
  "Endocrinología y nutrición",
  "Farmacología clínica",
  "Geriatría",
  "Hematología y hemoterapia",
  "Hidrología médica",
  "Infectología",
  "Inmunología",
  "Medicina aeroespacial / medicina aeronáutica",
  "Medicina crítica / intensiva",
  "Medicina del deporte / medicina física y rehabilitación",
  "Medicina del trabajo",
  "Medicina familiar y comunitaria",
  "Medicina interna",
  "Medicina legal y forense",
  "Medicina nuclear",
  "Medicina paliativa",
  "Medicina preventiva y salud pública",
  "Medicina transfusional y hemoterapia",
  "Microbiología y parasitología",
  "Nefrología",
  "Neumología",
  "Neurocirugía",
  "Neurofisiología clínica",
  "Neurología",
  "Obstetricia y ginecología",
  "Oftalmología",
  "Oncología médica",
  "Otorrinolaringología",
  "Pediatría",
  "Psiquiatría",
  "Radiodiagnóstico",
  "Reumatología",
  "Urología",
] as const;

type ValidationMessages = {
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
  passwordMin: string;
  passwordWeak: string;
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

const defaultMessages: ValidationMessages = {
  emailRequired: "El correo es requerido",
  emailInvalid: "Correo inválido",
  passwordRequired: "La contraseña es requerida",
  passwordMin: "La contraseña debe tener al menos 8 caracteres",
  passwordWeak: "La contraseña no cumple los requisitos de seguridad",
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

function createSignupSchema(m: ValidationMessages = defaultMessages) {
  return z
    .object({
      name: z.string().min(2, m.nameMin).optional(),
      email: z.string().min(1, m.emailRequired).email(m.emailInvalid),
      password: z.string().min(8, m.passwordMin).regex(STRONG_PASSWORD_RE, m.passwordWeak),
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
      password: z.string().min(8, m.passwordMin).regex(STRONG_PASSWORD_RE, m.passwordWeak),
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
