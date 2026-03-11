"use client";

import { useReducer, useState, useTransition } from "react";
import { toast } from "sonner";
import { FileText, Download, Loader2, MessageCircle } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
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
    default:
      return state;
  }
}

export function CertificadoButton({ informeId, patientName, phone, iconOnly = false }: CertificadoButtonProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isPending, startTransition] = useTransition();
  const [isSendingWA, setIsSendingWA] = useState(false);
  const t = useTranslations("whatsappCertButton");
  const locale = useLocale();

  const waTemplateName = locale === "en" ? "patient_certificate_en" : "patient_certificate_es";
  const waLanguageCode = locale === "en" ? "en" : "es_AR";

  async function handleSendWhatsApp() {
    if (!state.certUrl) return;
    setIsSendingWA(true);
    let success = false;
    let errorMessage = t("errorMessage");
    try {
      const response = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phone,
          templateName: waTemplateName,
          languageCode: waLanguageCode,
          parameters: [patientName, state.certUrl],
        }),
      });
      const data = (await response.json()) as { success?: boolean; error?: string };
      success = Boolean(data.success);
      if (data.error) {
        errorMessage = data.error;
      }
    } catch {
      success = false;
    }
    if (success) {
      toast.success(t("successTitle"), {
        description: t("successMessage", { patientName }),
      });
    } else {
      toast.error(t("errorTitle"), { description: errorMessage });
    }
    setIsSendingWA(false);
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
        toast.error("Error al generar certificado", {
          description: result.error,
        });
      } else if (result?.signedUrl) {
        dispatch({ type: "SET_CERT_URL", url: result.signedUrl });
        toast.success("Certificado generado", {
          description: `El certificado médico de ${patientName} está listo.`,
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
            <FileText className="size-3.5 text-emerald-600" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <FileText className="size-4 mr-1.5" />
            Crear Certificado
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Certificado médico</DialogTitle>
          <DialogDescription>
            Generá un certificado médico para {patientName} para presentar en trabajo, escuela o universidad.
          </DialogDescription>
        </DialogHeader>

        {state.certUrl ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <FileText className="size-7 text-primary" />
            </div>
            <p className="text-sm text-center text-muted-foreground">
              El certificado fue generado correctamente.
            </p>
            <Button asChild className="w-full">
              <a href={state.certUrl} target="_blank" rel="noopener noreferrer">
                <Download className="size-4 mr-1.5" />
                Descargar certificado
              </a>
            </Button>
            <Button
              className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white"
              onClick={handleSendWhatsApp}
              disabled={isSendingWA}
            >
              {isSendingWA ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <MessageCircle className="size-4 mr-1.5" />
              )}
              {t("label")}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => dispatch({ type: "RESET_FORM" })}
            >
              Generar otro certificado
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="daysOff">Días de reposo</Label>
                <Input
                  id="daysOff"
                  type="number"
                  min={1}
                  max={365}
                  placeholder="Ej: 2"
                  value={state.daysOff}
                  onChange={(e) => dispatch({ type: "SET_FIELD", field: "daysOff", value: e.target.value })}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Dejar vacío si no se indica reposo.
                </p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="diagnosis">Diagnóstico</Label>
                <Input
                  id="diagnosis"
                  placeholder="Ej: Síndrome gripal"
                  value={state.diagnosis}
                  onChange={(e) => dispatch({ type: "SET_FIELD", field: "diagnosis", value: e.target.value })}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Opcional. Se incluirá en el certificado si se completa.
                </p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="observations">Observaciones</Label>
                <Textarea
                  id="observations"
                  placeholder="Observaciones adicionales..."
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
                Cancelar
              </Button>
              <Button onClick={handleGenerate} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <FileText className="size-4 mr-1.5" />
                    Generar certificado
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
