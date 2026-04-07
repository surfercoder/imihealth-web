import { generateInformePDF, generateCertificadoPDF } from "@/lib/pdf";
import { generateInformeImage, generateCertificadoImage } from "@/lib/report-image";
import {
  CertOptions,
  DoctorInfo,
  PatientRelation,
  formatPatientDob,
} from "./helpers";

interface InformeMediaInput {
  patient: PatientRelation | null;
  patientNameFallback: string | undefined;
  dateStr: string;
  content: string;
  doctorInfo: DoctorInfo | null;
}

interface CertificadoMediaInput {
  patient: PatientRelation | null;
  patientNameFallback: string | undefined;
  dateStr: string;
  doctorInfo: DoctorInfo | null;
  certOptions: CertOptions | undefined;
}

export interface GeneratedMedia {
  pdfBytes: Uint8Array;
  pngBuffer: Buffer;
}

export async function generateInformeMedia(input: InformeMediaInput): Promise<GeneratedMedia> {
  const { patient, patientNameFallback, dateStr, content, doctorInfo } = input;

  const pdfBytes = await generateInformePDF({
    patientName: patient?.name ?? patientNameFallback ?? "",
    patientPhone: patient?.phone ?? null,
    date: dateStr,
    content,
    doctor: doctorInfo,
  });

  const pngBuffer = await generateInformeImage({
    patientName: patient?.name ?? patientNameFallback ?? "",
    patientPhone: patient?.phone ?? null,
    date: dateStr,
    content,
    doctor: doctorInfo,
  });

  return { pdfBytes, pngBuffer };
}

export async function generateCertificadoMedia(input: CertificadoMediaInput): Promise<GeneratedMedia> {
  const { patient, patientNameFallback, dateStr, doctorInfo, certOptions } = input;

  const patientDob = formatPatientDob(patient?.dob);

  const pdfBytes = await generateCertificadoPDF({
    patientName: patient?.name ?? patientNameFallback ?? "",
    patientDni: patient?.dni ?? null,
    patientDob,
    date: dateStr,
    diagnosis: certOptions?.diagnosis ?? null,
    daysOff: certOptions?.daysOff ?? null,
    observations: certOptions?.observations ?? null,
    doctor: doctorInfo,
  });

  const pngBuffer = await generateCertificadoImage({
    patientName: patient?.name ?? patientNameFallback ?? "",
    patientDob,
    date: dateStr,
    diagnosis: certOptions?.diagnosis ?? null,
    daysOff: certOptions?.daysOff ?? null,
    observations: certOptions?.observations ?? null,
    doctor: doctorInfo,
  });

  return { pdfBytes, pngBuffer };
}
