"use client";

import { CertificadoButton } from "@/components/certificado-button";

export function CertificadoIconButton({ informeId, patientName, phone }: { informeId: string; patientName: string; phone: string }) {
  return (
    <CertificadoButton informeId={informeId} patientName={patientName} phone={phone} iconOnly />
  );
}
