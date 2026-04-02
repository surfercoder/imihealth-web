"use client";

import { useState, useMemo, useReducer, useActionState, useTransition, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { verifyCaptchaToken } from "@/actions/verify-captcha";
import { ESPECIALIDADES } from "@/schemas/auth";
import { Loader2, CheckCircle2, ChevronsUpDown, Check, ArrowLeft, ScrollText, ShieldCheck } from "lucide-react";
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

  const sortedSpecialties = useMemo(() =>
    [...ESPECIALIDADES]
      .map((key) => ({ key, label: t(`specialties.${key}`) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [t]
  );

  const selectedLabel = field.value ? t(`specialties.${field.value}`) : "";

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
            {selectedLabel || t("specialtyPlaceholder")}
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
              {sortedSpecialties.map(({ key, label }) => (
                <CommandItem
                  key={key}
                  value={label}
                  className="text-card-foreground data-[selected=true]:bg-muted data-[selected=true]:text-card-foreground"
                  onSelect={() => {
                    field.onChange(key);
                    onOpenChange(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      field.value === key ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// --- Terms step state & reducer ---

interface TermsState {
  hasScrolledToBottom: boolean;
  consentChecked: boolean;
  captchaToken: string | null;
  captchaStatus: "idle" | "success" | "error" | "expired";
  captchaError: string | null;
  isVerifying: boolean;
}

type TermsAction =
  | { type: "SCROLL_TO_BOTTOM" }
  | { type: "SET_CONSENT"; value: boolean }
  | { type: "CAPTCHA_SUCCESS"; token: string }
  | { type: "CAPTCHA_ERROR" }
  | { type: "CAPTCHA_EXPIRE" }
  | { type: "VERIFY_START" }
  | { type: "VERIFY_FAILED"; error: string };

const termsInitialState: TermsState = {
  hasScrolledToBottom: false,
  consentChecked: false,
  captchaToken: null,
  captchaStatus: "idle",
  captchaError: null,
  isVerifying: false,
};

function termsReducer(state: TermsState, action: TermsAction): TermsState {
  switch (action.type) {
    case "SCROLL_TO_BOTTOM":
      return { ...state, hasScrolledToBottom: true };
    case "SET_CONSENT":
      /* v8 ignore next 3 */
      if (!action.value) {
        return { ...state, consentChecked: false, captchaToken: null, captchaStatus: "idle", captchaError: null };
      }
      return { ...state, consentChecked: true };
    case "CAPTCHA_SUCCESS":
      return { ...state, captchaToken: action.token, captchaStatus: "success", captchaError: null };
    case "CAPTCHA_ERROR":
      return { ...state, captchaToken: null, captchaStatus: "error", captchaError: null };
    case "CAPTCHA_EXPIRE":
      return { ...state, captchaToken: null, captchaStatus: "expired", captchaError: null };
    case "VERIFY_START":
      return { ...state, isVerifying: true, captchaError: null };
    case "VERIFY_FAILED":
      return { ...state, isVerifying: false, captchaToken: null, captchaStatus: "idle", captchaError: action.error };
    /* v8 ignore next 2 */
    default:
      return state;
  }
}

// --- TermsContent sub-component ---

function TermsContent() {
  const t = useTranslations("signupTerms");
  const terms = useTranslations("signupTerms.terms");
  return (
    <>
      <h2 className="text-base font-bold text-foreground">{terms("title")}</h2>
      <p className="text-xs text-muted-foreground">{t("termsLastUpdated")}</p>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s1Title")}</h3>
        <p>{terms("s1p1")}</p>
        <p>{terms("s1p2")}</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s2Title")}</h3>
        <p>{terms("s2p1")}</p>
        <p>{terms("s2p2")}</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s3Title")}</h3>
        <p>{terms("s3p1")}</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>{terms("s3li1")}</li>
          <li>{terms("s3li2")}</li>
          <li>{terms("s3li3")}</li>
          <li>{terms("s3li4")}</li>
          <li>{terms("s3li5")}</li>
          <li>{terms("s3li6")}</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s4Title")}</h3>
        <p>{terms("s4p1")}</p>
        <p>{terms("s4p2")}</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s5Title")}</h3>
        <p>{terms("s5p1")}</p>
        <p>{terms("s5p2")}</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s6Title")}</h3>
        <p>{terms("s6p1")}</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s7Title")}</h3>
        <p>{terms("s7p1")}</p>
        <p>{terms("s7p2")}</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s8Title")}</h3>
        <p>{terms("s8p1")}</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s9Title")}</h3>
        <p>{terms("s9p1")}</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s10Title")}</h3>
        <p>
          {terms("s10p1")}{" "}
          <span className="font-medium text-primary">{terms("s10email")}</span>{" "}
          {terms("s10p2")}
        </p>
      </section>

      <div className="h-4" aria-hidden />
    </>
  );
}

// --- TermsStep sub-component ---

interface TermsStepProps {
  onBack: () => void;
  onVerified: (token: string) => void;
  serverError?: string | null;
  isPending: boolean;
}

function TermsStep({ onBack, onVerified, serverError, isPending }: TermsStepProps) {
  const t = useTranslations("signupTerms");
  const tForm = useTranslations("signupForm");
  const scrollRef = useRef<HTMLDivElement>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [state, dispatch] = useReducer(termsReducer, termsInitialState);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    /* v8 ignore next */
    if (!el || state.hasScrolledToBottom) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) {
      dispatch({ type: "SCROLL_TO_BOTTOM" });
    }
  }, [state.hasScrolledToBottom]);

  const handleConsentChange = (checked: boolean | "indeterminate") => {
    const value = checked === true;
    dispatch({ type: "SET_CONSENT", value });
    /* v8 ignore next */
    if (!value) recaptchaRef.current?.reset();
  };

  const handleContinue = async () => {
    /* v8 ignore next */
    if (!state.captchaToken) return;
    dispatch({ type: "VERIFY_START" });
    let result: Awaited<ReturnType<typeof verifyCaptchaToken>> | null = null;
    try {
      result = await verifyCaptchaToken(state.captchaToken);
    } catch {
      // handled below
    }
    if (result === null) {
      recaptchaRef.current?.reset();
      dispatch({ type: "VERIFY_FAILED", error: t("verifyUnexpectedError") });
      return;
    }
    if (result.success) {
      onVerified(state.captchaToken);
    } else {
      recaptchaRef.current?.reset();
      /* v8 ignore next */
      dispatch({ type: "VERIFY_FAILED", error: result.error ?? t("verifyFailed") });
    }
  };

  const captchaDisplayError =
    state.captchaStatus === "error"
      ? t("captchaError")
      : state.captchaStatus === "expired"
      ? t("captchaExpired")
      : state.captchaError ?? null;

  const canContinue =
    state.consentChecked &&
    state.captchaStatus === "success" &&
    state.captchaToken !== null &&
    !state.isVerifying &&
    !isPending;

  return (
    <div className="space-y-5">
      {/* Amber notice */}
      <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
        <ScrollText className="size-4 mt-0.5 shrink-0" />
        <span>{t("description")}</span>
      </div>

      {/* Scrollable terms box */}
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-72 overflow-y-auto rounded-xl border border-border bg-muted/30 px-5 py-4 text-sm text-muted-foreground space-y-5 scroll-smooth"
        >
          <TermsContent />
        </div>
        {!state.hasScrolledToBottom && (
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 rounded-b-xl bg-gradient-to-t from-muted/80 to-transparent"
            aria-hidden
          />
        )}
      </div>

      {!state.hasScrolledToBottom && (
        <p className="text-center text-xs text-muted-foreground">{t("scrollPrompt")}</p>
      )}

      {/* Consent checkbox */}
      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border p-4 transition-all",
          state.hasScrolledToBottom
            ? "border-emerald-200 bg-emerald-50"
            : "border-border bg-muted/30 opacity-50 select-none"
        )}
      >
        <Checkbox
          id="terms-consent"
          checked={state.consentChecked}
          onCheckedChange={handleConsentChange}
          disabled={!state.hasScrolledToBottom}
          className="mt-0.5"
        />
        <Label
          htmlFor="terms-consent"
          className={cn(
            "text-sm leading-snug",
            state.hasScrolledToBottom ? "cursor-pointer text-foreground" : "cursor-not-allowed text-muted-foreground"
          )}
        >
          {t("acceptLabel")}
        </Label>
      </div>

      {/* reCAPTCHA — shown after consent is checked */}
      {state.consentChecked && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
            <p className="text-sm font-medium">{t("captchaTitle")}</p>
          </div>
          <p className="text-xs text-muted-foreground">{t("captchaSubtitle")}</p>
          <div className="flex items-center justify-start">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
              onChange={(token) => {
                if (token) dispatch({ type: "CAPTCHA_SUCCESS", token });
              }}
              onErrored={() => dispatch({ type: "CAPTCHA_ERROR" })}
              onExpired={() => dispatch({ type: "CAPTCHA_EXPIRE" })}
            />
          </div>
          {captchaDisplayError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <span>⚠</span> {captchaDisplayError}
            </p>
          )}
          {state.captchaStatus === "success" && !captchaDisplayError && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="size-3.5" />
              {t("captchaVerified")}
            </div>
          )}
        </div>
      )}

      {canContinue && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
          <CheckCircle2 className="size-4" />
          {t("allDone")}
        </div>
      )}

      {serverError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={state.isVerifying || isPending}
          className="sm:flex-1"
        >
          <ArrowLeft className="mr-2 size-4" />
          {t("back")}
        </Button>
        <Button
          type="button"
          disabled={!canContinue}
          onClick={handleContinue}
          className="sm:flex-1"
        >
          {state.isVerifying || isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t("verifying")}
            </>
          ) : (
            tForm("submit")
          )}
        </Button>
      </div>
    </div>
  );
}

// --- Success screen ---

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

// --- Registration step (step 1) ---

interface RegistrationStepProps {
  onSubmit: (values: ClientSignupFormValues) => void;
  isPending: boolean;
}

function RegistrationStep({ onSubmit, isPending }: RegistrationStepProps) {
  const t = useTranslations("signupForm");
  const v = useTranslations("validation");
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
          /* v8 ignore next */
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

// --- Main SignupForm ---

export function SignupForm() {
  const tTerms = useTranslations("signupTerms");
  const [state, formAction] = useActionState(signup, null);
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2>(1);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  function onStep1Submit(values: ClientSignupFormValues) {
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
    setPendingFormData(formData);
    setStep(2);
  }

  function onCaptchaVerified() {
    /* v8 ignore next */
    if (!pendingFormData) return;
    startTransition(() => formAction(pendingFormData));
  }

  if (state?.success) {
    return <SignupSuccess />;
  }

  if (step === 2) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {tTerms("stepBadge")}
            </span>
          </div>
          <CardTitle className="text-xl">{tTerms("title")}</CardTitle>
          <CardDescription>{tTerms("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <TermsStep
            onBack={() => setStep(1)}
            onVerified={onCaptchaVerified}
            serverError={state?.error}
            isPending={isPending}
          />
        </CardContent>
      </Card>
    );
  }

  return <RegistrationStep onSubmit={onStep1Submit} isPending={isPending} />;
}
