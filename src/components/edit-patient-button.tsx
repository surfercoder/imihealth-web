"use client";
"use no memo";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updatePatient } from "@/actions/patients";
import { useTranslations } from "next-intl";
import {
  COUNTRIES,
  detectCountryFromLocale,
} from "@/components/ui/phone-input";
import type { CountryCode } from "@/components/ui/phone-input";
import { PatientFormFields } from "@/components/nuevo-informe-dialog/patient-form-fields";
import { buildPatientSchema } from "@/components/nuevo-informe-dialog/schema";
import type { PatientFormValues } from "@/components/nuevo-informe-dialog/types";
import type { PatientWithStats } from "@/actions/patients";

function parseE164ToPhoneValue(e164: string | null) {
  if (!e164) return undefined;

  // Sort countries by dial code length (longest first) to match most specific
  const sorted = [...COUNTRIES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );

  for (const country of sorted) {
    if (e164.startsWith(country.dialCode)) {
      const subscriber = e164.slice(country.dialCode.length);
      return {
        countryCode: country.code as CountryCode,
        subscriber,
        e164,
      };
    }
  }

  const defaultCountry = detectCountryFromLocale();
  return {
    countryCode: defaultCountry.code,
    subscriber: e164.replace(/^\+/, ""),
    e164,
  };
}

interface EditPatientButtonProps {
  patient: PatientWithStats;
}

export function EditPatientButton({ patient }: EditPatientButtonProps) {
  const t = useTranslations("editPatientButton");
  const tForm = useTranslations("nuevoInformeDialog");
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const defaultCountry = detectCountryFromLocale();
  const patientSchema = buildPatientSchema(tForm);

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: patient.name,
      dni: patient.dni,
      dob: patient.dob || "",
      phone: parseE164ToPhoneValue(patient.phone) ?? {
        countryCode: defaultCountry.code,
        subscriber: "",
        e164: "",
      },
      email: patient.email || "",
      obraSocial: patient.obra_social || "",
      nroAfiliado: patient.nro_afiliado || "",
      plan: patient.plan || "",
    },
  });

  const { handleSubmit, reset } = form;

  async function onSubmit(values: PatientFormValues) {
    setIsLoading(true);

    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("dni", values.dni);
    if (values.dob) formData.append("dob", values.dob);
    if (values.phone?.subscriber) formData.append("phone", values.phone.e164);
    if (values.email) formData.append("email", values.email);
    if (values.obraSocial) formData.append("obraSocial", values.obraSocial);
    if (values.nroAfiliado) formData.append("nroAfiliado", values.nroAfiliado);
    if (values.plan) formData.append("plan", values.plan);

    const result = await updatePatient(patient.id, formData);
    setIsLoading(false);

    if (result.error) {
      toast.error(t("errorTitle"), { description: result.error });
      return;
    }

    setOpen(false);
    toast.success(t("successTitle"), {
      description: t("successMessage", { name: values.name }),
    });
  }

  function handleOpenChange(val: boolean) {
    if (isLoading) return;
    setOpen(val);
    if (!val) {
      reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
        >
          <Pencil className="size-4" />
          <span className="sr-only">{t("srLabel")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <PatientFormFields
            register={form.register}
            control={form.control}
            errors={form.formState.errors}
            isLoading={isLoading}
            defaultCountry={defaultCountry}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
