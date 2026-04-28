export interface PatientRelation {
  name: string;
  phone: string;
  dob: string | null;
  dni: string | null;
}

interface DoctorRow {
  name: string;
  matricula: string;
  especialidad: string;
  tagline: string | null;
  firma_digital: string | null;
}

export interface DoctorInfo {
  name: string;
  matricula: string;
  especialidad: string;
  tagline: string | null;
  firmaDigital: string | null;
}

export interface CertOptions {
  daysOff?: number | null;
  diagnosis?: string | null;
  observations?: string | null;
}

export function getLanguageCode(locale: string | undefined): string {
  return locale === "es" ? "es_AR" : "en";
}

export function getDocTemplateName(isInforme: boolean, locale: string | undefined): string {
  if (isInforme) {
    return locale === "es" ? "informe_con_documento_es" : "informe_con_documento_en";
  }
  return locale === "es" ? "certificado_con_documento_es" : "certificado_con_documento_en";
}

export function getImgTemplateName(isInforme: boolean, locale: string | undefined): string {
  if (isInforme) {
    return locale === "es" ? "informe_imagen_es" : "informe_imagen_en";
  }
  return locale === "es" ? "certificado_imagen_es" : "certificado_imagen_en";
}

export function getPedidoDocTemplateName(locale: string | undefined): string {
  return locale === "es" ? "pedido_con_documento_es" : "pedido_con_documento_en";
}

export function formatEsArDate(value: string): string {
  return new Date(value).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatPatientDob(dob: string | null | undefined): string | null {
  if (!dob) return null;
  return new Date(dob + "T00:00:00").toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function mapDoctorInfo(doctorData: DoctorRow | null | undefined): DoctorInfo | null {
  if (!doctorData) return null;
  return {
    name: doctorData.name,
    matricula: doctorData.matricula,
    especialidad: doctorData.especialidad,
    tagline: doctorData.tagline,
    firmaDigital: doctorData.firma_digital,
  };
}

export function getDocFilename(isInforme: boolean): string {
  return isInforme ? "informe-medico.pdf" : "certificado-medico.pdf";
}

export function getPngFilename(isInforme: boolean): string {
  return isInforme ? "informe-medico.png" : "certificado-medico.png";
}
