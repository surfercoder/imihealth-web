"use client";

import { useTranslations } from "next-intl";

export function PlantillasTab() {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {t("plantillas.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("plantillas.subtitle")}
        </p>
      </div>

      <div className="flex items-center justify-center min-h-[300px] rounded-xl border border-dashed bg-muted/30">
        <p className="text-sm text-muted-foreground">
          {t("plantillas.comingSoon")}
        </p>
      </div>
    </div>
  );
}
