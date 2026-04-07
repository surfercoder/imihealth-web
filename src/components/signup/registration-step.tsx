"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { detectCountryFromLocale } from "@/components/ui/phone-input";
import { RegistrationFormFields } from "@/components/signup/registration-form-fields";
import {
  buildClientSignupSchema,
  type ClientSignupFormValues,
} from "@/components/signup/registration-schema";

export type { ClientSignupFormValues } from "@/components/signup/registration-schema";

interface RegistrationStepProps {
  onSubmit: (values: ClientSignupFormValues) => void;
  isPending: boolean;
}

export function RegistrationStep({ onSubmit, isPending }: RegistrationStepProps) {
  const t = useTranslations("signupForm");
  const v = useTranslations("validation");
  const defaultCountry = detectCountryFromLocale();

  const clientSchema = buildClientSignupSchema(v);

  const form = useForm<ClientSignupFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: undefined,
      email: "",
      password: "",
      confirmPassword: "",
      dni: undefined,
      matricula: "",
      phone: {
        countryCode: defaultCountry.code,
        subscriber: "",
        e164: "",
      },
      especialidad: "",
      firmaDigital: undefined,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
            noValidate
          >
            <RegistrationFormFields form={form} isPending={isPending} />

            <Button type="submit" className="w-full" disabled={isPending}>
              {t("submit")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("hasAccount")}{" "}
              <Link
                href="/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                {t("login")}
              </Link>
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
