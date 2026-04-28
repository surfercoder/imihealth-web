"use client";

import { useMemo, useReducer, useState, useTransition } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { generateAndSaveCertificado } from "@/actions/informes";
import { extractDiagnosticoPresuntivo } from "@/app/api/pdf/pedido/utils";
import { buildCertOptions, initialState, reducer } from "./state";

interface UseCertificadoArgs {
  informeId: string;
  patientName: string;
  phone: string;
  informeDoctor?: string;
}

export function useCertificado({ informeId, patientName, phone, informeDoctor }: UseCertificadoArgs) {
  const defaultDiagnosis = useMemo(
    () => extractDiagnosticoPresuntivo(informeDoctor ?? null) ?? "",
    [informeDoctor],
  );
  const [state, dispatch] = useReducer(reducer, { ...initialState, diagnosis: defaultDiagnosis });
  const [isPending, startTransition] = useTransition();
  const [isSendingWa, setIsSendingWa] = useState(false);
  const tWa = useTranslations("whatsappCertButton");
  const t = useTranslations("certificado");
  const locale = useLocale();

  async function handleSendWhatsApp() {
    /* v8 ignore next */
    if (!state.certUrl) return;
    const fallbackError = tWa("errorMessage");
    setIsSendingWa(true);
    let data: { success?: boolean; error?: string } | null = null;
    const certOptions = buildCertOptions(state);
    try {
      const response = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phone,
          type: "certificado",
          informeId,
          patientName,
          locale,
          certOptions,
        }),
      });
      data = await response.json();
    } catch {
      // network error
    }

    if (data && data.success) {
      toast.success(tWa("successTitle"), {
        description: tWa("successMessage", { patientName }),
      });
    } else {
      const errorMsg = (data && data.error) ? data.error : fallbackError;
      toast.error(tWa("errorTitle"), { description: errorMsg });
    }
    setIsSendingWa(false);
  }

  function handleOpenChange(val: boolean) {
    if (!isPending) {
      dispatch(val ? { type: "OPEN" } : { type: "CLOSE", defaultDiagnosis });
    }
  }

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateAndSaveCertificado(informeId, buildCertOptions(state));

      if (result?.error) {
        toast.error(t("errorTitle"), {
          description: result.error,
        });
      } else if (result?.signedUrl) {
        dispatch({ type: "SET_CERT_URL", url: result.signedUrl });
        toast.success(t("generatedTitle"), {
          description: t("generatedDescription", { patientName }),
        });
      }
    });
  }

  return {
    state,
    dispatch,
    defaultDiagnosis,
    isPending,
    isSendingWa,
    t,
    tWa,
    handleSendWhatsApp,
    handleOpenChange,
    handleGenerate,
  };
}
