import Link from "next/link";
import { AlertCircle, Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InformeProcessingPanelProps {
  processingLabel: string;
  processingHint: string;
}

export function InformeProcessingPanel({ processingLabel, processingHint }: InformeProcessingPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-16 text-center shadow-sm">
      <Loader2 className="size-10 text-primary animate-spin mb-4" />
      <p className="font-medium text-card-foreground">{processingLabel}</p>
      <p className="mt-1 text-sm text-muted-foreground">{processingHint}</p>
    </div>
  );
}

interface InformeErrorPanelProps {
  informeId: string;
  isQuickReport: boolean;
  errorLabel: string;
  errorHint: string;
  recordAgainLabel: string;
}

export function InformeErrorPanel({
  informeId,
  isQuickReport,
  errorLabel,
  errorHint,
  recordAgainLabel,
}: InformeErrorPanelProps) {
  const recordHref = isQuickReport
    ? `/informes/${informeId}/grabar?type=quick`
    : `/informes/${informeId}/grabar`;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 p-16 text-center">
      <AlertCircle className="size-10 text-destructive mb-4" />
      <p className="font-medium text-destructive">{errorLabel}</p>
      <p className="mt-1 text-sm text-muted-foreground">{errorHint}</p>
      <Button asChild className="mt-6 bg-gray-950 text-white hover:bg-gray-950/80">
        <Link href={recordHref}>
          <Mic className="size-4 mr-1.5" />
          {recordAgainLabel}
        </Link>
      </Button>
    </div>
  );
}
