"use client";

import { useState } from "react";
import { AudioRecorder } from "@/components/audio-recorder";
import { QuickInformeResult } from "@/components/quick-informe-result";

interface QuickInformeFlowProps {
  informeId: string;
  doctorId: string;
}

/**
 * Owns the local state for the quick-informe flow: shows the AudioRecorder
 * until a report is generated, then swaps in-place to the result view.
 *
 * We keep the report in React state (not the URL) because reports can be
 * several KB of markdown, which both bloats the URL and breaks
 * `decodeURIComponent` on certain character sequences.
 */
export function QuickInformeFlow({ informeId, doctorId }: QuickInformeFlowProps) {
  const [informe, setInforme] = useState<string | null>(null);

  if (informe) {
    return (
      <QuickInformeResult
        informe={informe}
        onCreateAnother={() => setInforme(null)}
      />
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <AudioRecorder
        informeId={informeId}
        doctorId={doctorId}
        isQuickReport={true}
        onQuickReportComplete={setInforme}
      />
    </div>
  );
}
