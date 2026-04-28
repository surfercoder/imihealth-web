"use client";

import { useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { login } from "@/actions/auth";
import { createLoginSchema } from "@/schemas/auth";
import type { LoginFormValues } from "@/types/auth";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function LoginForm() {
  const t = useTranslations("loginForm");
  const v = useTranslations("validation");
  const [state, formAction] = useActionState(login, null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(createLoginSchema({
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
      taglineMax: v("taglineMax"),
    })),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginFormValues) {
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("password")}</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                    >
                      {t("forgotPassword")}
                    </Link>
                  </div>
                  <FormControl>
                    <PasswordInput
                      placeholder={t("passwordPlaceholder")}
                      autoComplete="current-password"
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
              {t("noAccount")}{" "}
              <Link
                href="/signup"
                className="text-primary underline-offset-4 hover:underline"
              >
                {t("register")}
              </Link>
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
