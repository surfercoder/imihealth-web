"use client";

import { CertificadoButton } from "@/components/certificado-button";

export function CertificadoIconButton({ informeId, patientName, phone, informeDoctor }: { informeId: string; patientName: string; phone: string; informeDoctor?: string }) {
  return (
    <CertificadoButton informeId={informeId} patientName={patientName} phone={phone} informeDoctor={informeDoctor} iconOnly />
  );
}
