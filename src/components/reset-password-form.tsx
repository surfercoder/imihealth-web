"use client";

import { useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
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
import { resetPassword } from "@/actions/auth";
import { createResetPasswordSchema } from "@/schemas/auth";
import type { ResetPasswordFormValues } from "@/types/auth";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function ResetPasswordForm() {
  const t = useTranslations("resetPasswordForm");
  const v = useTranslations("validation");
  const [state, formAction] = useActionState(resetPassword, null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(createResetPasswordSchema({
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
    defaultValues: { password: "", confirmPassword: "" },
  });

  function onSubmit(values: ResetPasswordFormValues) {
    const formData = new FormData();
    formData.set("password", values.password);
    formData.set("confirmPassword", values.confirmPassword);
    startTransition(() => formAction(formData));
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("newPassword")}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder={t("newPasswordPlaceholder")}
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
