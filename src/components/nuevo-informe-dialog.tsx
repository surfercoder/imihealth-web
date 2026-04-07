"use client";
"use no memo";

import { Suspense } from "react";
import { NuevoInformeDialogContent } from "./nuevo-informe-dialog/nuevo-informe-dialog-content";
import type { NuevoInformeDialogProps } from "./nuevo-informe-dialog/types";

export function NuevoInformeDialog(props: NuevoInformeDialogProps) {
  return (
    <Suspense fallback={null}>
      <NuevoInformeDialogContent {...props} />
    </Suspense>
  );
}
