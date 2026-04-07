"use client";

import type { UseFormReturn } from "react-hook-form";
import { RegistrationPersonalFields } from "@/components/signup/registration-personal-fields";
import { RegistrationCredentialsFields } from "@/components/signup/registration-credentials-fields";
import { type ClientSignupFormValues } from "@/components/signup/registration-schema";

interface RegistrationFormFieldsProps {
  form: UseFormReturn<ClientSignupFormValues>;
  isPending: boolean;
}

export function RegistrationFormFields({ form, isPending }: RegistrationFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <RegistrationPersonalFields form={form} isPending={isPending} />
      <RegistrationCredentialsFields form={form} />
    </div>
  );
}
