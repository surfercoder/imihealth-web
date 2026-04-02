"use client";

import { Suspense, useState } from "react";
import { FileText, Zap, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { createPatient, createInforme } from "@/actions/informes";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  PhoneInput,
  type PhoneInputValue,
  type CountryCode,
  COUNTRIES,
  detectCountryFromLocale,
} from "@/components/ui/phone-input";

type PatientFormValues = {
  name: string;
  dni: string;
  dob?: string;
  phone?: PhoneInputValue;
  email?: string;
  affiliateNumber?: string;
};

const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [CountryCode, ...CountryCode[]];

const phoneObjectSchema = z.object({
  countryCode: z.enum(COUNTRY_CODES),
  subscriber: z.string(),
  e164: z.string(),
});

function InformesTabContent() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const [showClassicDialog, setShowClassicDialog] = useState(false);
  const [isLoadingClassic, setIsLoadingClassic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultCountry = detectCountryFromLocale();

  const patientSchema = z.object({
    name: z.string().min(2, t("nuevoInformeDialog.validation.nameTooShort")),
    dni: z
      .string()
      .min(1, t("nuevoInformeDialog.validation.dniRequired"))
      .regex(/^\d{7,8}$/, t("nuevoInformeDialog.validation.dniInvalid")),
    dob: z.string().optional().or(z.literal("")),
    phone: phoneObjectSchema
      .refine(
        (val) => {
          if (!val.subscriber) return true;
          const country = COUNTRIES.find((c) => c.code === val.countryCode);
          /* v8 ignore next */
          if (!country) return false;
          const digits = val.subscriber.replace(/\D/g, "");
          return country.subscriberRegex.test(digits);
        },
        { message: t("nuevoInformeDialog.validation.phoneInvalid") }
      )
      .optional(),
    email: z
      .string()
      .email(t("nuevoInformeDialog.validation.emailInvalid"))
      .optional()
      .or(z.literal("")),
    affiliateNumber: z.string().optional().or(z.literal("")),
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      phone: {
        countryCode: defaultCountry.code,
        subscriber: "",
        e164: "",
      },
    },
  });

  const handleQuickReport = () => {
    router.push("/quick-informe");
  };

  const handleClassicReport = () => {
    setShowClassicDialog(true);
  };

  const onSubmitClassic = async (values: PatientFormValues) => {
    setIsLoadingClassic(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("dni", values.dni);
    if (values.dob) formData.append("dob", values.dob);
    if (values.phone?.subscriber) formData.append("phone", values.phone.e164);
    if (values.email) formData.append("email", values.email);
    if (values.affiliateNumber) formData.append("affiliateNumber", values.affiliateNumber);

    const patientResult = await createPatient(formData);
    if (patientResult.error || !patientResult.data) {
      const msg = patientResult.error ?? t("nuevoInformeDialog.errorPatient");
      setError(msg);
      toast.error(t("nuevoInformeDialog.errorPatient"), { description: msg });
      setIsLoadingClassic(false);
      return;
    }

    const informeResult = await createInforme(patientResult.data.id);
    if (informeResult.error || !informeResult.data) {
      const msg = informeResult.error ?? t("nuevoInformeDialog.errorInforme");
      setError(msg);
      toast.error(t("nuevoInformeDialog.errorInforme"), { description: msg });
      setIsLoadingClassic(false);
      return;
    }

    setShowClassicDialog(false);
    reset();
    const url = currentTab ? `/informes/${informeResult.data.id}/grabar?tab=${currentTab}` : `/informes/${informeResult.data.id}/grabar`;
    router.push(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {t("informes.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("informes.subtitle")}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Classic Report Card */}
        <button
          onClick={handleClassicReport}
          disabled={isLoadingClassic}
          className="group relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-8 text-left shadow-md transition-all hover:shadow-xl hover:scale-[1.02] hover:border-primary/50 hover:-translate-y-0.5 active:scale-[0.98] active:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-2 ring-primary/20">
              <FileText className="size-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                {t("informes.classic")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("informes.classicDesc")}
              </p>
            </div>
          </div>
        </button>

        {/* Quick Report Card */}
        <button
          onClick={handleQuickReport}
          className="group relative overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-8 text-left shadow-md transition-all hover:shadow-xl hover:scale-[1.02] hover:border-emerald-500/50 hover:-translate-y-0.5 active:scale-[0.98] active:shadow-sm"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500/20">
              <Zap className="size-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                {t("informes.quick")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("informes.quickDesc")}
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Classic Report Dialog */}
      <Dialog open={showClassicDialog} onOpenChange={(open) => {
        setShowClassicDialog(open);
        if (!open) {
          reset();
          setError(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("nuevoInformeDialog.title")}</DialogTitle>
            <DialogDescription>{t("nuevoInformeDialog.description")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmitClassic)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                {t("nuevoInformeDialog.fullName")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder={t("nuevoInformeDialog.fullNamePlaceholder")}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dni">
                {t("nuevoInformeDialog.dni")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dni"
                type="text"
                inputMode="numeric"
                placeholder={t("nuevoInformeDialog.dniPlaceholder")}
                {...register("dni")}
              />
              {errors.dni && (
                <p className="text-xs text-destructive">{errors.dni.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dob">
                {t("nuevoInformeDialog.dob")} <span className="text-muted-foreground text-xs">({t("nuevoInformeDialog.optional")})</span>
              </Label>
              <Input id="dob" type="date" {...register("dob")} />
              {errors.dob && (
                <p className="text-xs text-destructive">{errors.dob.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone-input">
                {t("nuevoInformeDialog.phone")} <span className="text-muted-foreground text-xs">({t("nuevoInformeDialog.optional")})</span>
              </Label>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => {
                  /* v8 ignore next 2 */
                  const selectedCountry =
                    COUNTRIES.find((c) => c.code === field.value?.countryCode) ?? defaultCountry;
                  return (
                    <>
                      <PhoneInput
                        id="phone-input"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        disabled={isLoadingClassic}
                        searchPlaceholder={t("nuevoInformeDialog.phoneSearchCountry")}
                        noCountryFound={t("nuevoInformeDialog.phoneNoCountry")}
                      />
                      {errors.phone && (
                        <p className="text-xs text-destructive">
                          {/* v8 ignore next */}
                          {errors.phone.message ?? errors.phone.subscriber?.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {t("nuevoInformeDialog.phoneHint")} {t("nuevoInformeDialog.phoneFormat", { format: selectedCountry.formatHint })}
                      </p>
                    </>
                  );
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">{t("nuevoInformeDialog.email")}</Label>
              <Input
                id="email"
                type="text"
                placeholder={t("nuevoInformeDialog.emailPlaceholder")}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="affiliateNumber">{t("nuevoInformeDialog.affiliateNumber")}</Label>
              <Input
                id="affiliateNumber"
                type="text"
                placeholder={t("nuevoInformeDialog.affiliateNumberPlaceholder")}
                {...register("affiliateNumber")}
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowClassicDialog(false)}
                disabled={isLoadingClassic}
              >
                {t("nuevoInformeDialog.cancel")}
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoadingClassic}>
                {isLoadingClassic ? (
                  <>
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                    {t("nuevoInformeDialog.creating")}
                  </>
                ) : (
                  t("nuevoInformeDialog.submit")
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function InformesTab() {
  return (
    <Suspense>
      <InformesTabContent />
    </Suspense>
  );
}
