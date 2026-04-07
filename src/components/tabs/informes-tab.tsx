"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { ClassicReportDialog } from "./informes-tab/classic-report-dialog";
import { ReportTypeCards } from "./informes-tab/report-type-cards";
import { useClassicInformeForm } from "./informes-tab/use-classic-informe-form";

function InformesTabContent() {
  const t = useTranslations();
  const {
    form,
    showClassicDialog,
    isLoadingClassic,
    error,
    defaultCountry,
    openDialog,
    closeDialog,
    onOpenChange,
    onSubmitClassic,
    handleQuickReport,
  } = useClassicInformeForm();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {t("informes.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("informes.subtitle")}
        </p>
      </div>

      <ReportTypeCards
        onClassicClick={openDialog}
        onQuickClick={handleQuickReport}
        isLoadingClassic={isLoadingClassic}
      />

      <ClassicReportDialog
        open={showClassicDialog}
        onOpenChange={onOpenChange}
        form={form}
        isLoadingClassic={isLoadingClassic}
        error={error}
        defaultCountry={defaultCountry}
        onCancel={closeDialog}
        onSubmit={onSubmitClassic}
      />
    </div>
  );
}

export function InformesTab() {
  return (
    <Suspense>
      <InformesTabContent />
    </Suspense>
  );
}
