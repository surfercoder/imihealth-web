"use client";

import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { User } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProfileFormValues } from "./schema";

interface PersonalInfoSectionProps {
  form: UseFormReturn<ProfileFormValues>;
  email: string;
}

export function PersonalInfoSection({ form, email }: PersonalInfoSectionProps) {
  const t = useTranslations("profilePage");
  const tSignup = useTranslations("signupForm");

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <User className="size-4" />
        {t("personalInfo")}
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tSignup("fullName")}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder={tSignup("fullNamePlaceholder")}
                  autoComplete="name"
                  {...field}
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
              <FormLabel>{tSignup("dni")}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder={tSignup("dniPlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Email - disabled */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">
            {tSignup("email")}
          </label>
          <Input
            type="email"
            value={email}
            disabled
            className="bg-muted"
          />
        </div>
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tSignup("phone")}</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder={tSignup("phonePlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <p className="col-span-1 text-xs text-muted-foreground -mt-2">
          {t("emailDisabledHint")}
        </p>
      </div>
    </div>
  );
}
