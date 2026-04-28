"use client";

import { useReducer, useState, useTransition } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { generatePedidos } from "@/actions/informes";
import { initialState, parseItems, reducer } from "./state";

interface UsePedidosArgs {
  informeId: string;
  informeDoctor: string;
  patientName: string;
  phone: string;
}

function extractEstudiosSolicitados(text: string): string {
  const lines = text.split("\n");
  let inPlan = false;
  let inEstudiosSection = false;
  const items: string[] = [];

  // Strip surrounding markdown bold markers so headers like "**Estudios:**" still match.
  const stripMd = (line: string): string => line.replace(/^\*+/, "").replace(/\*+$/, "").trim();

  const isPlanHeader = (line: string): boolean => {
    const stripped = stripMd(line);
    return /^P\s*[-–—]\s*PLAN:?$/i.test(stripped) || /^PLAN:?$/i.test(stripped);
  };

  // Section header: a non-list line ending with ":" (after stripping markdown bold).
  const isSectionHeader = (line: string): boolean => {
    if (line.startsWith("- ")) return false;
    return stripMd(line).endsWith(":");
  };

  const isEstudiosHeader = (line: string): boolean =>
    isSectionHeader(line) && /estudios?/i.test(stripMd(line));

  for (const line of lines) {
    const trimmed = line.trim();

    if (!inPlan) {
      if (isPlanHeader(trimmed)) inPlan = true;
      continue;
    }

    if (trimmed === "") continue;

    if (!inEstudiosSection) {
      if (isEstudiosHeader(trimmed)) inEstudiosSection = true;
      continue;
    }

    if (trimmed.startsWith("- ")) {
      items.push(trimmed);
      continue;
    }

    if (isSectionHeader(trimmed)) break;
  }

  return items.join("\n");
}

export function usePedidos({ informeId, informeDoctor, patientName, phone }: UsePedidosArgs) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isPending, startTransition] = useTransition();
  const [isSendingWa, setIsSendingWa] = useState(false);
  const tWa = useTranslations("whatsappPedidosButton");
  const t = useTranslations("pedidos");
  const locale = useLocale();

  const extractedItems = extractEstudiosSolicitados(informeDoctor);

  async function handleSendWhatsApp() {
    if (!state.pedidoUrls || state.pedidoUrls.length === 0) return;
    const fallbackError = tWa("errorMessage");
    setIsSendingWa(true);
    let data: { success?: boolean; error?: string } | null = null;
    const items = parseItems(state.items);
    try {
      const response = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phone,
          type: "pedidos",
          informeId,
          patientName,
          locale,
          pedidoItems: items,
        }),
      });
      data = await response.json();
    } catch {
      // network error
    }

    if (data && data.success) {
      toast.success(tWa("successTitle"), {
        description: tWa("successMessage", { patientName, count: items.length }),
      });
    } else {
      const errorMsg = (data && data.error) ? data.error : fallbackError;
      toast.error(tWa("errorTitle"), { description: errorMsg });
    }
    setIsSendingWa(false);
  }

  function handleOpenChange(val: boolean) {
    if (!isPending) {
      dispatch(val ? { type: "OPEN", items: extractedItems } : { type: "CLOSE" });
    }
  }

  function handleGenerate() {
    const items = parseItems(state.items);
    if (items.length === 0) return;

    startTransition(async () => {
      const result = await generatePedidos(informeId, items);

      if (result?.error) {
        toast.error(t("errorTitle"), {
          description: result.error,
        });
      } else if (result?.urls && result?.mergedUrl) {
        dispatch({ type: "SET_PEDIDO_URLS", urls: result.urls, mergedUrl: result.mergedUrl });
        toast.success(t("generatedTitle"), {
          description: t("generatedDescription", { count: items.length }),
        });
      }
    });
  }

  return {
    state,
    dispatch,
    isPending,
    isSendingWa,
    t,
    tWa,
    extractedItems,
    handleSendWhatsApp,
    handleOpenChange,
    handleGenerate,
  };
}
