"use client";

import { FileText, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

type ReportTypeCardsProps = {
  onClassicClick: () => void;
  onQuickClick: () => void;
  isLoadingClassic: boolean;
};

export function ReportTypeCards({
  onClassicClick,
  onQuickClick,
  isLoadingClassic,
}: ReportTypeCardsProps) {
  const t = useTranslations();

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {/* Classic Report Card */}
      <button
        onClick={onClassicClick}
        disabled={isLoadingClassic}
        className="group relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-8 text-left shadow-md transition-all hover:shadow-xl hover:scale-[1.02] hover:border-primary/50 hover:-translate-y-0.5 active:scale-[0.98] active:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-2 ring-primary/20">
            <FileText className="size-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              {t("informes.classic")}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("informes.classicDesc")}
            </p>
          </div>
        </div>
      </button>

      {/* Quick Report Card */}
      <button
        onClick={onQuickClick}
        className="group relative overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-8 text-left shadow-md transition-all hover:shadow-xl hover:scale-[1.02] hover:border-emerald-500/50 hover:-translate-y-0.5 active:scale-[0.98] active:shadow-sm"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500/20">
            <Zap className="size-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              {t("informes.quick")}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("informes.quickDesc")}
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}
