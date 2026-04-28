import { z } from "zod";
import { ESPECIALIDADES } from "@/schemas/auth";
import {
  type PhoneInputValue,
  type CountryCode,
  COUNTRIES,
} from "@/components/ui/phone-input";
import { allRulesPass } from "@/components/signup/password-strength-checklist";

const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [CountryCode, ...CountryCode[]];

const phoneObjectSchema = z.object({
  countryCode: z.enum(COUNTRY_CODES),
  subscriber: z.string(),
  e164: z.string(),
});

export type ClientSignupFormValues = {
  name?: string;
  email: string;
  password: string;
  confirmPassword: string;
  dni?: string;
  matricula: string;
  phone: PhoneInputValue;
  especialidad: string;
  tagline?: string;
  firmaDigital?: string;
  avatar?: string;
};

/* v8 ignore next 2 */
export const safeValue = (v: string | undefined | null): string => v ?? "";

type Translator = (key: string) => string;

export function buildClientSignupSchema(v: Translator) {
  return z
    .object({
      name: z.string().min(2, v("nameMin")).optional(),
      email: z.string().min(1, v("emailRequired")).email(v("emailInvalid")),
      password: z
        .string()
        .min(8, v("passwordMin"))
        .refine(allRulesPass, v("passwordWeak")),
      confirmPassword: z.string().min(1, v("confirmPasswordRequired")),
      dni: z
        .string()
        .min(1, v("dniRequired"))
        .regex(/^\d{7,8}$/, v("dniFormat"))
        .optional(),
      matricula: z
        .string()
        .min(1, v("matriculaRequired"))
        .regex(/^\d+$/, v("matriculaFormat")),
      phone: phoneObjectSchema.refine(
        (val) => {
          const country = COUNTRIES.find((c) => c.code === val.countryCode);
          /* v8 ignore next */
          if (!country) return false;
          const digits = val.subscriber.replace(/\D/g, "");
          return country.subscriberRegex.test(digits);
        },
        { message: v("phoneInvalid") }
      ),
      especialidad: z
        .string()
        .min(1, v("specialtyRequired"))
        .refine((val) => (ESPECIALIDADES as readonly string[]).includes(val), {
          message: v("specialtyInvalid"),
        }),
      tagline: z
        .string()
        .max(200, v("taglineMax"))
        .optional(),
      firmaDigital: z.string().optional(),
      avatar: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: v("passwordsMismatch"),
      path: ["confirmPassword"],
    });
}
