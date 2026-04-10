import { z } from "zod";
import { COUNTRIES } from "@/components/ui/phone-input";
import { COUNTRY_CODES } from "./types";

type Translator = (key: string) => string;

export function buildPhoneObjectSchema() {
  return z.object({
    countryCode: z.enum(COUNTRY_CODES),
    subscriber: z.string(),
    e164: z.string(),
  });
}

export function buildPatientSchema(t: Translator) {
  const phoneObjectSchema = buildPhoneObjectSchema();

  return z.object({
    name: z.string().min(2, t("validation.nameTooShort")),
    dni: z
      .string()
      .min(1, t("validation.dniRequired"))
      .regex(/^\d{7,8}$/, t("validation.dniInvalid")),
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
        { message: t("validation.phoneInvalid") }
      )
      .optional(),
    email: z
      .string()
      .email(t("validation.emailInvalid"))
      .optional()
      .or(z.literal("")),
    obraSocial: z.string().optional().or(z.literal("")),
    nroAfiliado: z.string().optional().or(z.literal("")),
    plan: z.string().optional().or(z.literal("")),
  });
}
