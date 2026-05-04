"use client";

import { useRouter } from "next/navigation";
import { AudioRecorder } from "@/components/audio-recorder";

interface QuickInformeFlowProps {
  doctorId: string;
}

/**
 * Owns the quick-informe recording flow. Once the report is generated and
 * persisted in `informes_rapidos`, we navigate to the dedicated result page
 * by id. The page fetches the row, so we don't need to pass report content
 * through the URL or React state.
 */
export function QuickInformeFlow({ doctorId }: QuickInformeFlowProps) {
  const { push } = useRouter();

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <AudioRecorder
        // The recorder requires an `informeId` for the classic flow; quick
        // reports create their own `informes_rapidos` row server-side, so we
        // pass an empty placeholder here.
        informeId=""
        doctorId={doctorId}
        isQuickReport={true}
        onQuickReportComplete={(informeRapidoId) =>
          push(`/informes-rapidos/${informeRapidoId}`)
        }
      />
    </div>
  );
}
