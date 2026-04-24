import { createElement } from "react";
import Link from "next/link";
import { Clock, FileText } from "lucide-react";
import { DeleteInformeButton } from "@/components/delete-informe-button";
import { resolveStatusClass, resolveStatusIcon } from "./status-config";

export interface InformeHistoryItemData {
  id: string;
  status: string;
  href: string;
  date: string;
  /** Date formatted as dd/mm/yyyy for search matching (e.g. "15/04/2026") */
  dateSearch: string;
  preview: string | null;
  statusLabel: string;
  /** Full plain-text of informe_doctor (markdown stripped) for client-side search */
  rawText: string | null;
}

interface InformeHistoryItemProps {
  informe: InformeHistoryItemData;
  reportLinkLabel: string;
}

export function InformeHistoryItem({ informe, reportLinkLabel }: InformeHistoryItemProps) {
  const statusIcon = resolveStatusIcon(informe.status);
  const statusClass = resolveStatusClass(informe.status);

  return (
    <div className="group relative flex items-start gap-4 rounded-xl border bg-card px-5 py-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <Link
        href={informe.href}
        className="absolute inset-0 rounded-xl"
        aria-label={`${reportLinkLabel} ${informe.date}`}
      />

      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5 relative z-10 pointer-events-none">
        <FileText className="size-4" />
      </div>

      <div className="flex-1 min-w-0 relative z-10 pointer-events-none">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass}`}
          >
            {createElement(statusIcon, {
              className: `size-3 ${informe.status === "processing" ? "animate-spin" : ""}`,
            })}
            {informe.statusLabel}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {informe.date}
          </span>
        </div>
        {informe.preview && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {informe.preview}
          </p>
        )}
      </div>

      <div className="relative z-10 self-center">
        <DeleteInformeButton informeId={informe.id} date={informe.date} />
      </div>
    </div>
  );
}
