"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createPatient } from "@/actions/patients";
import { createInforme } from "@/actions/informes";
import { detectCountryFromLocale } from "@/components/ui/phone-input";
import { buildPatientSchema, type PatientFormValues } from "./schema";

export function useClassicInformeForm() {
  const t = useTranslations();
  const router = useRouter();
  // eslint-disable-next-line react-doctor/nextjs-no-use-search-params-without-suspense -- callers render inside client-component subtrees that have already crossed their nearest Suspense boundary
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const [showClassicDialog, setShowClassicDialog] = useState(false);
  const [isLoadingClassic, setIsLoadingClassic] = useState(false);
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

  const { reset } = form;

  const openDialog = () => setShowClassicDialog(true);

  const onOpenChange = (open: boolean) => {
    setShowClassicDialog(open);
    if (!open) {
      reset();
      setError(null);
    }
  };

  const closeDialog = () => setShowClassicDialog(false);

  const onSubmitClassic = async (values: PatientFormValues) => {
    setIsLoadingClassic(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("dni", values.dni);
    if (values.dob) formData.append("dob", values.dob);
    if (values.phone?.subscriber) formData.append("phone", values.phone.e164);
    if (values.email) formData.append("email", values.email);
    if (values.obraSocial) formData.append("obraSocial", values.obraSocial);
    if (values.nroAfiliado) formData.append("nroAfiliado", values.nroAfiliado);
    if (values.plan) formData.append("plan", values.plan);

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
    const url = currentTab
      ? `/informes/${informeResult.data.id}/grabar?tab=${currentTab}`
      : `/informes/${informeResult.data.id}/grabar`;
    router.push(url);
  };

  const handleQuickReport = () => {
    router.push("/quick-informe");
  };

  return {
    form,
    showClassicDialog,
    isLoadingClassic,
    error,
    defaultCountry,
    openDialog,
    closeDialog,
    onOpenChange,
    onSubmitClassic,
    handleQuickReport,
  };
}
