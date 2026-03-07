"use client";

import { useState, useActionState, useTransition } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { signup } from "@/actions/auth";
import { createSignupSchema, ESPECIALIDADES } from "@/schemas/auth";
import type { SignupFormValues } from "@/types/auth";
import { Loader2, CheckCircle2, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { SignatureField } from "@/components/signature-field";
import { useTranslations } from "next-intl";

function SpecialtyCombobox({ field, open, onOpenChange }: {
  field: { value: string; onChange: (value: string) => void };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("signupForm");
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <FormControl>
          <button
            type="button"
            role="combobox"
            aria-controls="especialidad-listbox"
            aria-expanded={open}
            className={cn(
              "border-input bg-transparent flex h-9 w-full items-center justify-between rounded-md border px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none",
              "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              field.value ? "text-card-foreground" : "text-muted-foreground"
            )}
          >
            {field.value || t("specialtyPlaceholder")}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command className="bg-white text-card-foreground">
          <CommandInput placeholder={t("searchSpecialty")} className="text-card-foreground placeholder:text-muted-foreground" />
          <CommandList id="especialidad-listbox">
            <CommandEmpty className="text-muted-foreground">
              {t("specialtyNotFound")}
            </CommandEmpty>
            <CommandGroup>
              {ESPECIALIDADES.map((esp) => (
                <CommandItem
                  key={esp}
                  value={esp}
                  className="text-card-foreground data-[selected=true]:bg-muted data-[selected=true]:text-card-foreground"
                  onSelect={(val) => {
                    field.onChange(val);
                    onOpenChange(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      field.value === esp ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {esp}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SignupSuccess() {
  const t = useTranslations("signupForm");
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-6" />
        </div>
        <div>
          <p className="font-semibold">{t("successTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("successMessage")}</p>
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

/* v8 ignore next 2 */
const safeValue = (v: string | undefined | null): string => v ?? "";

export function SignupForm() {
  const t = useTranslations("signupForm");
  const v = useTranslations("validation");
  const [state, formAction] = useActionState(signup, null);
  const [isPending, startTransition] = useTransition();
  const [especialidadOpen, setEspecialidadOpen] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(createSignupSchema({
      emailRequired: v("emailRequired"),
      emailInvalid: v("emailInvalid"),
      passwordRequired: v("passwordRequired"),
      passwordMin: v("passwordMin"),
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
    defaultValues: {
      name: undefined,
      email: "",
      password: "",
      confirmPassword: "",
      dni: undefined,
      matricula: "",
      phone: "",
      especialidad: "",
      firmaDigital: undefined,
    },
  });

  function onSubmit(values: SignupFormValues) {
    const formData = new FormData();
    /* v8 ignore next */
    formData.set("name", values.name ?? "");
    formData.set("email", values.email);
    formData.set("password", values.password);
    formData.set("confirmPassword", values.confirmPassword);
    /* v8 ignore next */
    formData.set("dni", values.dni ?? "");
    formData.set("matricula", values.matricula);
    formData.set("phone", values.phone);
    formData.set("especialidad", values.especialidad);
    /* v8 ignore next */
    formData.set("firmaDigital", values.firmaDigital ?? "");
    startTransition(() => formAction(formData));
  }

  if (state?.success) {
    return <SignupSuccess />;
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
            className="flex flex-col gap-5"
            noValidate
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Row 1: Nombre | DNI */}
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

              {/* Row 2: Correo | Teléfono */}
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("phone")}</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="tel"
                        placeholder={t("phonePlaceholder")}
                        autoComplete="tel"
                        {...field}
                        value={safeValue(field.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Row 3: Matrícula | Especialidad */}
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

              {/* Row 4: Firma Digital — full width */}
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

              {/* Row 5: Contraseña | Confirmar contraseña */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("password")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t("passwordPlaceholder")}
                        autoComplete="new-password"
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
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("confirmPassword")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
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

            {state?.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t("creating")}
                </>
              ) : (
                t("submit")
              )}
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
