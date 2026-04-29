"use client";

import { useCallback, useReducer, useState, useTransition } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { generatePatientPedidos } from "@/actions/informes";
import { initialState, itemsToText, parseItemsText, reducer } from "./state";
import { parseDictation } from "./parse-dictation";
import { useRecording } from "./use-recording";

interface UseDictarPedidosArgs {
  patientId: string;
  patientName: string;
  phone: string;
}

export function useDictarPedidos({ patientId, patientName, phone }: UseDictarPedidosArgs) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isPending, startTransition] = useTransition();
  const [isSendingWa, setIsSendingWa] = useState(false);
  const t = useTranslations("dictarPedidos");
  const tWa = useTranslations("whatsappPedidosButton");
  const locale = useLocale();

  const handleMicError = useCallback(
    (message: string) => {
      dispatch({ type: "SET_ERROR", error: message });
      toast.error(t("micErrorTitle"), { description: message });
    },
    [t],
  );

  const recording = useRecording({ dispatch, onMicError: handleMicError });

  const handleStop = useCallback(() => {
    const transcript = recording.stopRecording();
    const parsed = parseDictation(transcript);
    dispatch({
      type: "STOP_AND_REVIEW",
      transcript,
      itemsText: itemsToText(parsed.items),
      diagnostico: parsed.diagnostico ?? "",
    });
  }, [recording]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        recording.cleanup();
        dispatch({ type: "CLOSE" });
        return;
      }
      dispatch({ type: "OPEN" });
    },
    [recording],
  );

  const handleGenerate = useCallback(() => {
    const items = parseItemsText(state.itemsText);
    if (items.length === 0) return;
    const diagnostico = state.diagnostico.trim() || null;

    dispatch({ type: "SET_GENERATING" });
    startTransition(async () => {
      const result = await generatePatientPedidos(patientId, items, diagnostico);
      if ("error" in result && result.error) {
        dispatch({ type: "SET_ERROR", error: result.error });
        toast.error(t("errorTitle"), { description: result.error });
        dispatch({ type: "STOP_AND_REVIEW", transcript: state.finalTranscript, itemsText: state.itemsText, diagnostico: state.diagnostico });
        return;
      }
      if ("mergedUrl" in result && result.mergedUrl) {
        dispatch({ type: "SET_SUCCESS", mergedUrl: result.mergedUrl });
        toast.success(t("generatedTitle"), {
          description: t("generatedDescription", { count: items.length }),
        });
      }
    });
  }, [patientId, state.itemsText, state.diagnostico, state.finalTranscript, t]);

  const handleSendWhatsApp = useCallback(async () => {
    const items = parseItemsText(state.itemsText);
    if (items.length === 0) return;
    const fallbackError = tWa("errorMessage");
    setIsSendingWa(true);
    let data: { success?: boolean; error?: string } | null = null;
    try {
      const response = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phone,
          type: "pedidos-patient",
          patientId,
          patientName,
          locale,
          pedidoItems: items,
          diagnostico: state.diagnostico.trim() || null,
        }),
      });
      data = await response.json();
    } catch {
      /* v8 ignore next */
    }

    if (data && data.success) {
      toast.success(tWa("successTitle"), {
        description: tWa("successMessage", { patientName, count: items.length }),
      });
    } else {
      const errorMsg = data?.error ?? fallbackError;
      toast.error(tWa("errorTitle"), { description: errorMsg });
    }
    setIsSendingWa(false);
  }, [locale, patientId, patientName, phone, state.diagnostico, state.itemsText, tWa]);

  const handleResetToIdle = useCallback(() => {
    dispatch({ type: "RESET_TO_IDLE" });
  }, []);

  return {
    state,
    isPending,
    isSendingWa,
    t,
    tWa,
    recording,
    handleOpenChange,
    handleStop,
    handleGenerate,
    handleSendWhatsApp,
    handleResetToIdle,
    dispatch,
  };
}
