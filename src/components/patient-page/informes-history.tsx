import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InformeHistoryItem, type InformeHistoryItemData } from "./informe-history-item";

interface InformesHistoryProps {
  informes: InformeHistoryItemData[];
  labels: {
    history: string;
    countLabel: string;
    noConsults: string;
    noConsultsHint: string;
    reportLinkLabel: string;
  };
}

export function InformesHistory({ informes, labels }: InformesHistoryProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{labels.history}</h2>
        <Badge variant="secondary" className="text-xs">
          {labels.countLabel}
        </Badge>
      </div>

      {informes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-12 text-center shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
            <FileText className="size-6" />
          </div>
          <p className="font-medium text-card-foreground">{labels.noConsults}</p>
          <p className="mt-1 text-sm text-muted-foreground">{labels.noConsultsHint}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {informes.map((informe) => (
            <InformeHistoryItem
              key={informe.id}
              informe={informe}
              reportLinkLabel={labels.reportLinkLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
