"use client";

import { useReducer, useState, useTransition } from "react";
import { toast } from "sonner";
import { FileText, Download, Loader2, MessageCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { generateAndSaveCertificado } from "@/actions/informes";

interface CertificadoButtonProps {
  informeId: string;
  patientName: string;
  phone: string;
  iconOnly?: boolean;
}

type State = {
  open: boolean;
  daysOff: string;
  diagnosis: string;
  observations: string;
  certUrl: string | null;
};

type Action =
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "SET_FIELD"; field: "daysOff" | "diagnosis" | "observations"; value: string }
  | { type: "SET_CERT_URL"; url: string }
  | { type: "RESET_FORM" };

const initialState: State = {
  open: false,
  daysOff: "",
  diagnosis: "",
  observations: "",
  certUrl: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "OPEN":
      return { ...state, open: true };
    case "CLOSE":
      return initialState;
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_CERT_URL":
      return { ...state, certUrl: action.url };
    case "RESET_FORM":
      return { ...state, certUrl: null, daysOff: "", diagnosis: "", observations: "" };
    /* v8 ignore next 2 */
    default:
      return state;
  }
}

export function CertificadoButton({ informeId, patientName, phone, iconOnly = false }: CertificadoButtonProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
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
    const certOptions = {
      daysOff: state.daysOff ? parseInt(state.daysOff, 10) : null,
      diagnosis: state.diagnosis.trim() || null,
      observations: state.observations.trim() || null,
    };
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
      dispatch(val ? { type: "OPEN" } : { type: "CLOSE" });
    }
  }

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateAndSaveCertificado(informeId, {
        daysOff: state.daysOff ? parseInt(state.daysOff, 10) : null,
        diagnosis: state.diagnosis.trim() || null,
        observations: state.observations.trim() || null,
      });

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

  return (
    <Dialog open={state.open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-emerald-100/50"
          >
            <FileText className="size-6 text-emerald-600" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <FileText className="size-4 mr-1.5" />
            {t("trigger")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { patientName })}
          </DialogDescription>
        </DialogHeader>

        {state.certUrl ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <FileText className="size-7 text-primary" />
            </div>
            <p className="text-sm text-center text-muted-foreground">
              {t("successMessage")}
            </p>
            <Button asChild className="w-full">
              <a href={state.certUrl} target="_blank" rel="noopener noreferrer">
                <Download className="size-4 mr-1.5" />
                {t("download")}
              </a>
            </Button>
            <Button
              className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white"
              onClick={handleSendWhatsApp}
              disabled={isSendingWa}
            >
              {isSendingWa ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <MessageCircle className="size-4 mr-1.5" />
              )}
              {tWa("label")}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => dispatch({ type: "RESET_FORM" })}
            >
              {t("generateAnother")}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="daysOff">{t("daysOffLabel")}</Label>
                <Input
                  id="daysOff"
                  type="number"
                  min={1}
                  max={365}
                  placeholder={t("daysOffPlaceholder")}
                  value={state.daysOff}
                  onChange={(e) => dispatch({ type: "SET_FIELD", field: "daysOff", value: e.target.value })}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  {t("daysOffHint")}
                </p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="diagnosis">{t("diagnosisLabel")}</Label>
                <Input
                  id="diagnosis"
                  placeholder={t("diagnosisPlaceholder")}
                  value={state.diagnosis}
                  onChange={(e) => dispatch({ type: "SET_FIELD", field: "diagnosis", value: e.target.value })}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  {t("diagnosisHint")}
                </p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="observations">{t("observationsLabel")}</Label>
                <Textarea
                  id="observations"
                  placeholder={t("observationsPlaceholder")}
                  value={state.observations}
                  onChange={(e) => dispatch({ type: "SET_FIELD", field: "observations", value: e.target.value })}
                  disabled={isPending}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                {t("cancel")}
              </Button>
              <Button onClick={handleGenerate} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                    {t("generating")}
                  </>
                ) : (
                  <>
                    <FileText className="size-4 mr-1.5" />
                    {t("generate")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
