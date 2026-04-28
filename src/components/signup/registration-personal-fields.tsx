"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  PhoneInput,
  COUNTRIES,
  detectCountryFromLocale,
} from "@/components/ui/phone-input";
import { SpecialtyCombobox } from "@/components/signup/specialty-combobox";
import { AvatarUpload } from "@/components/avatar-upload";
import { type ClientSignupFormValues, safeValue } from "@/components/signup/registration-schema";

interface RegistrationPersonalFieldsProps {
  form: UseFormReturn<ClientSignupFormValues>;
  isPending: boolean;
}

export function RegistrationPersonalFields({ form, isPending }: RegistrationPersonalFieldsProps) {
  const t = useTranslations("signupForm");
  const [especialidadOpen, setEspecialidadOpen] = useState(false);
  const defaultCountry = detectCountryFromLocale();

  const nameValue = form.watch("name");

  return (
    <>
      <FormField
        control={form.control}
        name="avatar"
        render={({ field, fieldState }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>{t("avatar")}</FormLabel>
            <FormControl>
              <AvatarUpload
                value={field.value ?? null}
                onChange={(dataUrl) => field.onChange(dataUrl ?? undefined)}
                initialsSource={nameValue}
                disabled={isPending}
                /* v8 ignore next */
                error={fieldState.error?.message}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("fullName")}</FormLabel>
            <FormControl>
              <Input
                type="text"
                placeholder={t("fullNamePlaceholder")}
                autoComplete="name"
                {...field}
                value={safeValue(field.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="dni"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("dni")}</FormLabel>
            <FormControl>
              <Input
                type="text"
                inputMode="numeric"
                placeholder={t("dniPlaceholder")}
                {...field}
                value={safeValue(field.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem className="pb-5">
            <FormLabel>{t("email")}</FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder={t("emailPlaceholder")}
                autoComplete="email"
                {...field}
                value={safeValue(field.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => {
          const selectedCountry =
            /* v8 ignore next */
            COUNTRIES.find((c) => c.code === field.value.countryCode) ?? defaultCountry;
          return (
            <FormItem>
              <FormLabel>{t("phone")}</FormLabel>
              <FormControl>
                <PhoneInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={isPending}
                  searchPlaceholder={t("phoneSearchCountry")}
                  noCountryFound={t("phoneNoCountry")}
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground">
                {t("phoneFormat", { format: selectedCountry.formatHint })}
              </p>
            </FormItem>
          );
        }}
      />

      <FormField
        control={form.control}
        name="matricula"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("matricula")}</FormLabel>
            <FormControl>
              <Input
                type="text"
                inputMode="numeric"
                placeholder={t("matriculaPlaceholder")}
                {...field}
                value={safeValue(field.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="especialidad"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>{t("specialty")}</FormLabel>
            <SpecialtyCombobox
              field={field}
              open={especialidadOpen}
              onOpenChange={setEspecialidadOpen}
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
