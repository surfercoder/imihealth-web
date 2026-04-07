import { FileText } from "lucide-react";
import { TranscriptDialog, type DialogTurn } from "@/components/transcript-dialog";
import { TranscriptMonologue } from "@/components/transcript-monologue";

interface TranscriptSectionProps {
  transcript: string;
  transcriptType: string | null;
  transcriptDialog: DialogTurn[] | null;
  patientName: string | null;
  transcriptLabel: string;
  summaryLabel: string;
}

export function TranscriptSection({
  transcript,
  transcriptType,
  transcriptDialog,
  patientName,
  transcriptLabel,
  summaryLabel,
}: TranscriptSectionProps) {
  return (
    <details className="rounded-xl border bg-card shadow-sm overflow-hidden group">
      <summary className="flex cursor-pointer items-center gap-2 px-5 py-4 text-sm font-medium text-card-foreground hover:bg-muted transition-colors select-none">
        <FileText className="size-4 text-muted-foreground" />
        {transcriptLabel}
        <span className="ml-auto text-xs text-muted-foreground">{summaryLabel}</span>
      </summary>
      <div className="border-t px-5 py-6">
        {transcriptType === "monologue" ? (
          <TranscriptMonologue transcript={transcript} />
        ) : transcriptDialog ? (
          <TranscriptDialog
            dialog={transcriptDialog}
            patientName={patientName ?? "Patient"}
          />
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-card-foreground">
            {transcript}
          </p>
        )}
      </div>
    </details>
  );
}

interface TranscriptSummaryArgs {
  transcriptDialog: DialogTurn[] | null;
  transcriptType: string | null;
  interventionsLabel: (count: number) => string;
  monologueLabel: string;
  fullLabel: string;
}

export function buildTranscriptSummary({
  transcriptDialog,
  transcriptType,
  interventionsLabel,
  monologueLabel,
  fullLabel,
}: TranscriptSummaryArgs): string {
  if (transcriptDialog) return interventionsLabel(transcriptDialog.length);
  if (transcriptType === "monologue") return monologueLabel;
  return fullLabel;
}
