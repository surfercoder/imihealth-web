"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CertificadoForm } from "@/components/certificado-button/certificado-form";
import { CertificadoSuccess } from "@/components/certificado-button/certificado-success";
import { TriggerButton } from "@/components/certificado-button/trigger-button";
import { useCertificado } from "@/components/certificado-button/use-certificado";

interface CertificadoButtonProps {
  informeId: string;
  patientName: string;
  phone: string;
  informeDoctor?: string;
  iconOnly?: boolean;
}

export function CertificadoButton({ informeId, patientName, phone, informeDoctor, iconOnly = false }: CertificadoButtonProps) {
  const {
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
  } = useCertificado({ informeId, patientName, phone, informeDoctor });

  return (
    <Dialog open={state.open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <TriggerButton iconOnly={iconOnly} label={t("trigger")} />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { patientName })}
          </DialogDescription>
        </DialogHeader>

        {state.certUrl ? (
          <CertificadoSuccess
            isSendingWa={isSendingWa}
            onSendWhatsApp={handleSendWhatsApp}
            onResetForm={() => dispatch({ type: "RESET_FORM", defaultDiagnosis })}
            successMessage={t("successMessage")}
            whatsappLabel={tWa("label")}
            generateAnotherLabel={t("generateAnother")}
            viewOnlineLabel={t("viewOnline")}
            certUrl={state.certUrl!}
          />
        ) : (
          <CertificadoForm
            state={state}
            dispatch={dispatch}
            isPending={isPending}
            onCancel={() => handleOpenChange(false)}
            onGenerate={handleGenerate}
            t={t}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
