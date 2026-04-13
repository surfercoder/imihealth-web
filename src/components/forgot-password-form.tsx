"use client";

import { useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { forgotPassword } from "@/actions/auth";
import { createForgotPasswordSchema } from "@/schemas/auth";
import type { ForgotPasswordFormValues } from "@/types/auth";
import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function ForgotPasswordForm() {
  const t = useTranslations("forgotPasswordForm");
  const v = useTranslations("validation");
  const [state, formAction] = useActionState(forgotPassword, null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(createForgotPasswordSchema({
      emailRequired: v("emailRequired"),
      emailInvalid: v("emailInvalid"),
      passwordRequired: v("passwordRequired"),
      passwordMin: v("passwordMin"),
      passwordWeak: v("passwordWeak"),
      confirmPasswordRequired: v("confirmPasswordRequired"),
      passwordsMismatch: v("passwordsMismatch"),
      nameMin: v("nameMin"),
      dniRequired: v("dniRequired"),
      dniFormat: v("dniFormat"),
      matriculaRequired: v("matriculaRequired"),
      matriculaFormat: v("matriculaFormat"),
      phoneRequired: v("phoneRequired"),
      phoneInvalid: v("phoneInvalid"),
      specialtyRequired: v("specialtyRequired"),
      specialtyInvalid: v("specialtyInvalid"),
    })),
    defaultValues: { email: "" },
  });

  function onSubmit(values: ForgotPasswordFormValues) {
    const formData = new FormData();
    formData.set("email", values.email);
    startTransition(() => formAction(formData));
  }

  if (state?.success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <MailCheck className="size-6" />
          </div>
          <div>
            <p className="font-semibold">{t("successTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("successMessage")}
            </p>
          </div>
          <Link
            href="/login"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            {t("backToLogin")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("title")}</CardTitle>
        <CardDescription>
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("email")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t("emailPlaceholder")}
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {state?.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t("submitting")}
                </>
              ) : (
                t("submit")
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("rememberPassword")}{" "}
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
