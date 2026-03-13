"use client";

import * as Sentry from "@sentry/nextjs";
import type { ReactElement } from "react";

export function SentryErrorBoundary({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: ReactElement;
}) {
  return (
    <Sentry.ErrorBoundary
      fallback={
        fallback ?? (
          <div className="flex flex-col items-center justify-center gap-4 p-8">
            <h3 className="text-lg font-semibold">Algo salió mal</h3>
            <p className="text-sm text-muted-foreground">
              El error fue reportado automáticamente.
            </p>
          </div>
        )
      }
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
