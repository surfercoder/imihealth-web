"use client";

import { PedidosButton } from "@/components/pedidos-button";

export function PedidosIconButton({
  informeId,
  informeDoctor,
  patientName,
  phone,
}: {
  informeId: string;
  informeDoctor: string;
  patientName: string;
  phone: string;
}) {
  return (
    <PedidosButton
      informeId={informeId}
      informeDoctor={informeDoctor}
      patientName={patientName}
      phone={phone}
      iconOnly
    />
  );
}
