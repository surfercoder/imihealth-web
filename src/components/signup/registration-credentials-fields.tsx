"use client";

import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";
import { PasswordInput } from "@/components/ui/password-input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SignatureField } from "@/components/signature-field";
import { type ClientSignupFormValues, safeValue } from "@/components/signup/registration-schema";
import { PasswordStrengthChecklist } from "@/components/signup/password-strength-checklist";

interface RegistrationCredentialsFieldsProps {
  form: UseFormReturn<ClientSignupFormValues>;
}

export function RegistrationCredentialsFields({ form }: RegistrationCredentialsFieldsProps) {
  const t = useTranslations("signupForm");

  return (
    <>
      <div className="col-span-1 sm:col-span-2">
        <FormField
          control={form.control}
          name="firmaDigital"
          render={({ field, fieldState }) => {
            /* v8 ignore next */
            const sigError = fieldState.error?.message;
            return (
              <FormItem>
                <FormControl>
                  <SignatureField
                    onChange={field.onChange}
                    error={sigError}
                  />
                </FormControl>
              </FormItem>
            );
          }}
        />
      </div>

      <div className="col-span-1 sm:col-span-2">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("password")}</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder={t("passwordPlaceholder")}
                  autoComplete="new-password"
                  {...field}
                  value={safeValue(field.value)}
                />
              </FormControl>
              <PasswordStrengthChecklist password={safeValue(field.value)} />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="col-span-1 sm:col-span-2">
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("confirmPassword")}</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder={t("confirmPasswordPlaceholder")}
                  autoComplete="new-password"
                  {...field}
                  value={safeValue(field.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
