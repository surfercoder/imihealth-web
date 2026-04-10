import { z } from "zod";
import {
  type PhoneInputValue,
  type CountryCode,
  COUNTRIES,
} from "@/components/ui/phone-input";

export type PatientFormValues = {
  name: string;
  dni: string;
  dob?: string;
  phone?: PhoneInputValue;
  email?: string;
  obraSocial?: string;
  nroAfiliado?: string;
  plan?: string;
};

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [
  CountryCode,
  ...CountryCode[],
];

export const phoneObjectSchema = z.object({
  countryCode: z.enum(COUNTRY_CODES),
  subscriber: z.string(),
  e164: z.string(),
});

export function buildPatientSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(2, t("nuevoInformeDialog.validation.nameTooShort")),
    dni: z
      .string()
      .min(1, t("nuevoInformeDialog.validation.dniRequired"))
      .regex(/^\d{7,8}$/, t("nuevoInformeDialog.validation.dniInvalid")),
    dob: z.string().optional().or(z.literal("")),
    phone: phoneObjectSchema
      .refine(
        (val) => {
          if (!val.subscriber) return true;
          const country = COUNTRIES.find((c) => c.code === val.countryCode);
          /* v8 ignore next */
          if (!country) return false;
          const digits = val.subscriber.replace(/\D/g, "");
          return country.subscriberRegex.test(digits);
        },
        { message: t("nuevoInformeDialog.validation.phoneInvalid") }
      )
      .optional(),
    email: z
      .string()
      .email(t("nuevoInformeDialog.validation.emailInvalid"))
      .optional()
      .or(z.literal("")),
    obraSocial: z.string().optional().or(z.literal("")),
    nroAfiliado: z.string().optional().or(z.literal("")),
    plan: z.string().optional().or(z.literal("")),
  });
}
