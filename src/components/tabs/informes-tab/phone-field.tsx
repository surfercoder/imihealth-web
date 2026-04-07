"use client";

import { useTranslations } from "next-intl";
import { Controller, type Control, type FieldError, type FieldErrors, type Merge } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { PhoneInput, COUNTRIES } from "@/components/ui/phone-input";
import type { PatientFormValues } from "./schema";

type Country = (typeof COUNTRIES)[number];

type PhoneFieldProps = {
  control: Control<PatientFormValues>;
  isLoadingClassic: boolean;
  defaultCountry: Country;
  error?: Merge<FieldError, FieldErrors<NonNullable<PatientFormValues["phone"]>>>;
};

export function PhoneField({
  control,
  isLoadingClassic,
  defaultCountry,
  error,
}: PhoneFieldProps) {
  const t = useTranslations();

  return (
    <div className="space-y-1.5">
      <Label htmlFor="phone-input">
        {t("nuevoInformeDialog.phone")}{" "}
        <span className="text-muted-foreground text-xs">
          ({t("nuevoInformeDialog.optional")})
        </span>
      </Label>
      <Controller
        name="phone"
        control={control}
        render={({ field }) => {
          /* v8 ignore next 3 */
          const selectedCountry =
            COUNTRIES.find((c) => c.code === field.value?.countryCode) ??
            defaultCountry;
          return (
            <>
              <PhoneInput
                id="phone-input"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={isLoadingClassic}
                searchPlaceholder={t("nuevoInformeDialog.phoneSearchCountry")}
                noCountryFound={t("nuevoInformeDialog.phoneNoCountry")}
              />
              {error && (
                <p className="text-xs text-destructive">
                  {/* v8 ignore next */}
                  {error.message ?? error.subscriber?.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {t("nuevoInformeDialog.phoneHint")}{" "}
                {t("nuevoInformeDialog.phoneFormat", {
                  format: selectedCountry.formatHint,
                })}
              </p>
            </>
          );
        }}
      />
    </div>
  );
}
