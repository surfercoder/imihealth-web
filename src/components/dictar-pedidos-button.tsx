"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TriggerButton } from "@/components/dictar-pedidos/trigger-button";
import { useDictarPedidos } from "@/components/dictar-pedidos/use-dictar-pedidos";
import { RecordingStep } from "@/components/dictar-pedidos/recording-step";
import { ReviewStep } from "@/components/dictar-pedidos/review-step";
import { SuccessStep } from "@/components/dictar-pedidos/success-step";
import { parseItemsText } from "@/components/dictar-pedidos/state";

interface DictarPedidosButtonProps {
  patientId: string;
  patientName: string;
  phone: string;
}

export function DictarPedidosButton({
  patientId,
  patientName,
  phone,
}: DictarPedidosButtonProps) {
  const {
    state,
    isPending,
    isSendingWa,
    t,
    recording,
    handleOpenChange,
    handleStop,
    handleGenerate,
    handleSendWhatsApp,
    handleResetToIdle,
    dispatch,
  } = useDictarPedidos({ patientId, patientName, phone });

  const showRecording =
    state.phase === "idle" || state.phase === "recording" || state.phase === "paused";
  const showReview = state.phase === "review" || state.phase === "generating";
  const showSuccess = state.phase === "success";

  return (
    <Dialog open={state.open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <TriggerButton label={t("trigger")} />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { patientName })}
          </DialogDescription>
        </DialogHeader>

        {showRecording && (
          <RecordingStep
            phase={state.phase}
            duration={state.duration}
            liveTranscript={state.liveTranscript}
            onStart={recording.startRecording}
            onPause={recording.pauseRecording}
            onResume={recording.resumeRecording}
            onStop={handleStop}
          />
        )}

        {showReview && (
          <ReviewStep
            itemsText={state.itemsText}
            diagnostico={state.diagnostico}
            isPending={isPending}
            onItemsChange={(value) => dispatch({ type: "SET_ITEMS_TEXT", value })}
            onDiagnosticoChange={(value) => dispatch({ type: "SET_DIAGNOSTICO", value })}
            onRecordAgain={handleResetToIdle}
            onGenerate={handleGenerate}
          />
        )}

        {showSuccess && state.mergedUrl && (
          <SuccessStep
            isSendingWa={isSendingWa}
            pedidoCount={parseItemsText(state.itemsText).length}
            mergedUrl={state.mergedUrl}
            onSendWhatsApp={handleSendWhatsApp}
            onResetToIdle={handleResetToIdle}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
