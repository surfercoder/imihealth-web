"use client";

import { useTranslations } from "next-intl";

export function InstructionsCard() {
  const t = useTranslations("dictarPedidos");
  return (
    <div className="rounded-lg border bg-card p-4 text-sm shadow-sm">
      <p className="font-medium mb-1">{t("howItWorks")}</p>
      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
        <li>{t("step1")}</li>
        <li>{t("step2")}</li>
        <li>{t("step3")}</li>
        <li>{t("step4")}</li>
      </ol>
    </div>
  );
}
