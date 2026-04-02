"use client";

import * as Sentry from "@sentry/nextjs";
import type { ReactElement } from "react";
import { useTranslations } from "next-intl";

function DefaultFallback() {
  const t = useTranslations("errorBoundary");
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <h3 className="text-lg font-semibold">{t("title")}</h3>
      <p className="text-sm text-muted-foreground">
        {t("autoReported")}
      </p>
    </div>
  );
}

export function SentryErrorBoundary({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: ReactElement;
}) {
  return (
    <Sentry.ErrorBoundary
      fallback={fallback ?? <DefaultFallback />}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
