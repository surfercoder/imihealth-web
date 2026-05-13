"use client";
"use no memo";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { createPatient } from "@/actions/patients";
import { createInforme } from "@/actions/informes";
import { useCurrentTab } from "@/hooks/use-current-tab";
import { detectCountryFromLocale } from "@/components/ui/phone-input";
import { buildPatientSchema } from "./schema";
import type { PatientFormValues } from "./types";

export function useNuevoInformeForm() {
  const t = useTranslations("nuevoInformeDialog");
  const router = useRouter();
  const currentTab = useCurrentTab();
  const [open, setOpen] = useState(false);
  const [isLoading, startLoading] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const defaultCountry = detectCountryFromLocale();
  const patientSchema = buildPatientSchema(t);

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      phone: {
        countryCode: defaultCountry.code,
        subscriber: "",
        e164: "",
      },
    },
  });

  const { handleSubmit, reset } = form;

  const onSubmit = (values: PatientFormValues) => {
    setError(null);

    startLoading(async () => {
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("dni", values.dni);
      if (values.dob) formData.append("dob", values.dob);
      if (values.phone?.subscriber) formData.append("phone", values.phone.e164);
      if (values.email) formData.append("email", values.email);
      /* v8 ignore next 3 */
      if (values.obraSocial) formData.append("obraSocial", values.obraSocial);
      if (values.nroAfiliado) formData.append("nroAfiliado", values.nroAfiliado);
      if (values.plan) formData.append("plan", values.plan);

      const patientResult = await createPatient(formData);
      if (patientResult.error || !patientResult.data) {
        const msg = patientResult.error ?? t("errorPatient");
        setError(msg);
        toast.error(t("errorPatient"), { description: msg });
        return;
      }

      const informeResult = await createInforme(patientResult.data.id);
      if (informeResult.error || !informeResult.data) {
        const msg = informeResult.error ?? t("errorInforme");
        setError(msg);
        toast.error(t("errorInforme"), { description: msg });
        return;
      }

      setOpen(false);
      reset();
      const url = currentTab
        ? `/informes/${informeResult.data.id}/grabar?tab=${currentTab}`
        : `/informes/${informeResult.data.id}/grabar`;
      router.push(url);
    });
  };

  const handleOpenChange = useCallback(
    (v: boolean) => {
      setOpen(v);
      if (!v) {
        reset();
        setError(null);
      }
    },
    [reset]
  );

  return {
    form,
    open,
    setOpen,
    isLoading,
    error,
    defaultCountry,
    handleOpenChange,
    submit: handleSubmit(onSubmit),
  };
}
