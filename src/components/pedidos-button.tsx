"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PedidosForm } from "@/components/pedidos-button/pedidos-form";
import { PedidosSuccess } from "@/components/pedidos-button/pedidos-success";
import { TriggerButton } from "@/components/pedidos-button/trigger-button";
import { usePedidos } from "@/components/pedidos-button/use-pedidos";
import { parseItems } from "@/components/pedidos-button/state";

interface PedidosButtonProps {
  informeId: string;
  informeDoctor: string;
  patientName: string;
  phone: string;
  iconOnly?: boolean;
}

export function PedidosButton({ informeId, informeDoctor, patientName, phone, iconOnly = false }: PedidosButtonProps) {
  const {
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
  } = usePedidos({ informeId, informeDoctor, patientName, phone });

  return (
    <Dialog open={state.open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <TriggerButton iconOnly={iconOnly} label={t("trigger")} />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { patientName })}
          </DialogDescription>
        </DialogHeader>

        {state.pedidoUrls ? (
          <PedidosSuccess
            isSendingWa={isSendingWa}
            onSendWhatsApp={handleSendWhatsApp}
            onResetForm={() => dispatch({ type: "RESET_FORM", items: extractedItems })}
            successMessage={t("successMessage")}
            whatsappLabel={tWa("label")}
            generateAnotherLabel={t("generateAnother")}
            viewOnlineLabel={t("viewOnline")}
            pedidoCount={parseItems(state.items).length}
            mergedUrl={state.mergedUrl!}
          />
        ) : (
          <PedidosForm
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
