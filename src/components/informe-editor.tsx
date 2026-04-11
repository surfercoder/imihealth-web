"use client";

import { DoctorReportCard } from "./informe-editor/doctor-report-card";
import { PatientReportCard } from "./informe-editor/patient-report-card";

interface InformeEditorProps {
  informeId: string;
  informeDoctor: string;
  informePaciente: string;
  patientName?: string;
  patientEmail?: string | null;
  pdfUrl?: string | null;
  whatsappPhone?: string;
  doctorName?: string;
  doctorEmail?: string;
  doctorPhone?: string;
  isQuickReport?: boolean;
}

export function InformeEditor({
  informeId,
  informeDoctor,
  informePaciente,
  patientName,
  patientEmail,
  pdfUrl,
  whatsappPhone,
  doctorName,
  doctorEmail,
  doctorPhone,
  isQuickReport = false,
}: InformeEditorProps) {
  return (
    <div className="space-y-4">
      {isQuickReport ? (
        <DoctorReportCard
          informeId={informeId}
          informeDoctor={informeDoctor}
          patientName={patientName}
          doctorName={doctorName}
          doctorEmail={doctorEmail}
          doctorPhone={doctorPhone}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <DoctorReportCard
            informeId={informeId}
            informeDoctor={informeDoctor}
            patientName={patientName}
            whatsappPhone={whatsappPhone}
            doctorName={doctorName}
            doctorEmail={doctorEmail}
            doctorPhone={doctorPhone}
          />
          <PatientReportCard
            informeId={informeId}
            informePaciente={informePaciente}
            patientName={patientName}
            patientEmail={patientEmail}
            pdfUrl={pdfUrl}
            whatsappPhone={whatsappPhone}
            doctorName={doctorName}
          />
        </div>
      )}
    </div>
  );
}
