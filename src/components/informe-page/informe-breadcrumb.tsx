import { createElement } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Clock, AlertCircle, Loader2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const statusVariants: Record<string, "secondary" | "default" | "destructive"> = {
  recording: "secondary",
  processing: "secondary",
  completed: "default",
  error: "destructive",
};

const statusIcons: Record<string, LucideIcon> = {
  recording: Clock,
  processing: Loader2,
  completed: FileText,
  error: AlertCircle,
};

function getStatusVariant(status: string) {
  return statusVariants[status] ?? "destructive";
}

function getStatusIcon(status: string): LucideIcon {
  return statusIcons[status] ?? AlertCircle;
}

interface InformeBreadcrumbProps {
  patient: { id: string; name: string } | null;
  tab?: string;
  reportLabel: string;
  homeLabel: string;
  quickLabel: string;
  status: string;
  statusLabel: string;
}

export function InformeBreadcrumb({
  patient,
  tab,
  reportLabel,
  homeLabel,
  quickLabel,
  status,
  statusLabel,
}: InformeBreadcrumbProps) {
  const statusIcon = getStatusIcon(status);
  const statusVariant = getStatusVariant(status);

  return (
    <div className="border-b border-border/40">
      <div className="mx-auto flex h-11 max-w-5xl items-center gap-3 px-6">
        {patient ? (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href={tab ? `/patients/${patient.id}?tab=${tab}` : `/patients/${patient.id}`}>
                <ArrowLeft className="size-4 mr-1.5" />
                {patient.name}
              </Link>
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-sm text-foreground/60 truncate">{reportLabel}</span>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href={tab ? `/?tab=${tab}` : "/"}>
                <ArrowLeft className="size-4 mr-1.5" />
                {homeLabel}
              </Link>
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-sm text-foreground/60 truncate">{quickLabel}</span>
          </>
        )}
        <Badge variant={statusVariant} className="ml-auto flex items-center gap-1.5 text-xs">
          {createElement(statusIcon, { className: "size-3" })}
          {statusLabel}
        </Badge>
      </div>
    </div>
  );
}
