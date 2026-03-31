"use client";

import { Suspense } from "react";
import Link from "next/link";
import {
  FileText,
  User,
  Phone,
  Clock,
  ChevronRight,
  Loader2,
  AlertCircle,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import { useCurrentTab } from "@/hooks/use-current-tab";

interface InformeRow {
  id: string;
  status: string;
  created_at: string;
  patients: {
    name: string;
    phone: string;
    email: string | null;
  } | null;
}

interface InformesListProps {
  informes: InformeRow[];
}

const statusIcons = {
  recording: Mic,
  processing: Loader2,
  completed: FileText,
  error: AlertCircle,
};

const statusClasses: Record<string, string> = {
  recording: "text-destructive bg-destructive/10 border-destructive/20",
  processing: "text-primary bg-primary/10 border-primary/20",
  completed: "text-emerald-600 bg-emerald-50 border-emerald-200",
  error: "text-destructive bg-destructive/10 border-destructive/20",
};

function InformesListContent({ informes }: InformesListProps) {
  const t = useTranslations("informesList");
  const locale = useLocale();
  const currentTab = useCurrentTab();

  if (informes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center shadow-sm">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
          <FileText className="size-7" />
        </div>
        <p className="font-medium text-card-foreground">{t("empty")}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("emptyHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {informes.map((informe) => {
        const statusKey = informe.status as keyof typeof statusIcons;
        const StatusIcon = statusIcons[statusKey] ?? AlertCircle;
        const statusClass = statusClasses[informe.status] ?? statusClasses.error;
        const statusLabel = t(`status.${statusKey}` as Parameters<typeof t>[0]);
        const baseHref =
          informe.status === "recording"
            ? `/informes/${informe.id}/grabar`
            : `/informes/${informe.id}`;
        const href = currentTab ? `${baseHref}?tab=${currentTab}` : baseHref;

        const date = new Date(informe.created_at).toLocaleDateString(locale === "en" ? "en-US" : "es-AR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <Link
            key={informe.id}
            href={href}
            className="group flex items-center gap-4 rounded-xl border bg-card px-5 py-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="size-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium truncate text-card-foreground">
                  {informe.patients?.name ?? t("unknownPatient")}
                </p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                    statusClass
                  )}
                >
                  <StatusIcon
                    className={cn(
                      "size-3",
                      informe.status === "processing" && "animate-spin"
                    )}
                  />
                  {statusLabel}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                {informe.patients?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3" />
                    {informe.patients.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {date}
                </span>
              </div>
            </div>

            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-0.5" />
          </Link>
        );
      })}
    </div>
  );
}

export function InformesList(props: InformesListProps) {
  return (
    <Suspense fallback={null}>
      <InformesListContent {...props} />
    </Suspense>
  );
}
