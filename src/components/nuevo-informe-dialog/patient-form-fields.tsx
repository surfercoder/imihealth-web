"use client";
"use no memo";

import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import {
  PhoneInput,
  COUNTRIES,
  detectCountryFromLocale,
} from "@/components/ui/phone-input";
import type { PatientFormValues } from "./types";

type CountryInfo = ReturnType<typeof detectCountryFromLocale>;

interface PatientFormFieldsProps {
  register: UseFormRegister<PatientFormValues>;
  control: Control<PatientFormValues>;
  errors: FieldErrors<PatientFormValues>;
  isLoading: boolean;
  defaultCountry: CountryInfo;
}

export function PatientFormFields({
  register,
  control,
  errors,
  isLoading,
  defaultCountry,
}: PatientFormFieldsProps) {
  const t = useTranslations("nuevoInformeDialog");

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="name">
          {t("fullName")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder={t("fullNamePlaceholder")}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dni">
          {t("dni")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="dni"
          type="text"
          inputMode="numeric"
          placeholder={t("dniPlaceholder")}
          {...register("dni")}
        />
        {errors.dni && (
          <p className="text-xs text-destructive">{errors.dni.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dob">
          {t("dob")} <span className="text-muted-foreground text-xs">({t("optional")})</span>
        </Label>
        <Input id="dob" type="date" {...register("dob")} />
        {errors.dob && (
          <p className="text-xs text-destructive">{errors.dob.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone-input">
          {t("phone")} <span className="text-muted-foreground text-xs">({t("optional")})</span>
        </Label>
        <Controller
          name="phone"
          control={control}
          render={({ field }) => {
            /* v8 ignore next 2 */
            const selectedCountry =
              COUNTRIES.find((c) => c.code === field.value?.countryCode) ?? defaultCountry;
            return (
              <>
                <PhoneInput
                  id="phone-input"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={isLoading}
                  searchPlaceholder={t("phoneSearchCountry")}
                  noCountryFound={t("phoneNoCountry")}
                />
                {/* v8 ignore next 4 */}
                {errors.phone && (
                  <p className="text-xs text-destructive">
                    {errors.phone.message ?? errors.phone.subscriber?.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t("phoneHint")} {t("phoneFormat", { format: selectedCountry.formatHint })}
                </p>
              </>
            );
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          type="text"
          placeholder={t("emailPlaceholder")}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>
    </>
  );
}
