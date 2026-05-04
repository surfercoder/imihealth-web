export type {
  Informe,
  InformeStatus,
  CertificadoOptions,
} from "@/types/informe";

export { createInforme } from "./informes/create-informe";
export { processInformeFromTranscript } from "./informes/process-transcript";
export { deleteInforme } from "./informes/delete";
export { getInformes, getInforme } from "./informes/queries";
export {
  updateInformeDoctorOnly,
  updateInformePacienteWithPdf,
  updateInformeReports,
} from "./informes/updates";
export { regenerateReportFromEdits } from "./informes/regenerate";
export { recordPatientConsent } from "./informes/consent";
export { generateAndSaveCertificado } from "./informes/certificado";
export { generatePedidos } from "./informes/pedidos";
export { generatePatientPedidos } from "./informes/patient-pedidos";
