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
  let inEstudios = false;
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect start of Plan section (e.g. "**P - PLAN**", "P - PLAN", "Plan:")
    if (/^\*{0,2}P\s*[-–—]\s*PLAN\*{0,2}:?$/i.test(trimmed) || /^\*{0,2}PLAN\*{0,2}:?$/i.test(trimmed)) {
      inPlan = true;
      inEstudios = false;
      continue;
    }

    if (!inPlan) continue;

    // Detect next top-level section after Plan (starts with a letter or **letter, not a list item)
    // e.g. "**S - SUBJETIVO**", "## Sección", numbered sections like "7."
    if (/^\*{2}[A-Z]/.test(trimmed) && !(/estudios/i.test(trimmed))) {
      // Another top-level bold section header that's not estudios → end of Plan
      break;
    }

    // Within Plan, match any header containing "estudios"
    if (/estudios/i.test(trimmed)) {
      inEstudios = true;
      continue;
    }

    if (inEstudios) {
      if (trimmed.startsWith("- ")) {
        items.push(trimmed);
      } else if (trimmed.startsWith("**") || (trimmed.endsWith(":") && !trimmed.startsWith("- "))) {
        // New subsection header within Plan → leave estudios but keep scanning Plan
        inEstudios = false;
      } else if (trimmed === "") {
        if (items.length > 0) inEstudios = false;
      }
    }
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
