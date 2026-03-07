"use client";

import { useState, useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { ESPECIALIDADES } from "@/schemas/auth";
import { Loader2, CheckCircle2, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { SignatureField } from "@/components/signature-field";
import { useTranslations } from "next-intl";
import {
  PhoneInput,
  type PhoneInputValue,
  type CountryCode,
  COUNTRIES,
  detectCountryFromLocale,
} from "@/components/ui/phone-input";

const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [CountryCode, ...CountryCode[]];

const phoneObjectSchema = z.object({
  countryCode: z.enum(COUNTRY_CODES),
  subscriber: z.string(),
  e164: z.string(),
});

type ClientSignupFormValues = {
  name?: string;
  email: string;
  password: string;
  confirmPassword: string;
  dni?: string;
  matricula: string;
  phone: PhoneInputValue;
  especialidad: string;
  firmaDigital?: string;
};

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

  const defaultCountry = detectCountryFromLocale();

  const clientSchema = z
    .object({
      name: z.string().min(2, v("nameMin")).optional(),
      email: z.string().min(1, v("emailRequired")).email(v("emailInvalid")),
      password: z.string().min(8, v("passwordMin")),
      confirmPassword: z.string().min(1, v("confirmPasswordRequired")),
      dni: z
        .string()
        .min(1, v("dniRequired"))
        .regex(/^\d{7,8}$/, v("dniFormat"))
        .optional(),
      matricula: z
        .string()
        .min(1, v("matriculaRequired"))
        .regex(/^\d+$/, v("matriculaFormat")),
      phone: phoneObjectSchema.refine(
        (val) => {
          const country = COUNTRIES.find((c) => c.code === val.countryCode);
          if (!country) return false;
          const digits = val.subscriber.replace(/\D/g, "");
          return country.subscriberRegex.test(digits);
        },
        { message: v("phoneInvalid") }
      ),
      especialidad: z
        .string()
        .min(1, v("specialtyRequired"))
        .refine((val) => (ESPECIALIDADES as readonly string[]).includes(val), {
          message: v("specialtyInvalid"),
        }),
      firmaDigital: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: v("passwordsMismatch"),
      path: ["confirmPassword"],
    });

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

  function onSubmit(values: ClientSignupFormValues) {
    const formData = new FormData();
    /* v8 ignore next */
    formData.set("name", values.name ?? "");
    formData.set("email", values.email);
    formData.set("password", values.password);
    formData.set("confirmPassword", values.confirmPassword);
    /* v8 ignore next */
    formData.set("dni", values.dni ?? "");
    formData.set("matricula", values.matricula);
    formData.set("phone", values.phone.e164);
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
