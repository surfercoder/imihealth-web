import { PROMPT as cirugiaOrtopedicaYTraumatologia } from "./specialties/cirugia-ortopedica-y-traumatologia";
import { PROMPT as cardiologia } from "./specialties/cardiologia";
import { PROMPT as dermatologia } from "./specialties/dermatologia";
import { PROMPT as dermatologiaMedicoQuirurgicaYVenereologia } from "./specialties/dermatologia-medico-quirurgica-y-venereologia";
import { PROMPT as obstetriciaYGinecologia } from "./specialties/obstetricia-y-ginecologia";
import { PROMPT as urologia } from "./specialties/urologia";
import { PROMPT as medicinaInterna } from "./specialties/medicina-interna";
import { PROMPT as alergologia } from "./specialties/alergologia";
import { PROMPT as anestesiologiaYReanimacion } from "./specialties/anestesiologia-y-reanimacion";
import { PROMPT as endocrinologiaYNutricion } from "./specialties/endocrinologia-y-nutricion";
import { PROMPT as geriatria } from "./specialties/geriatria";
import { PROMPT as hematologiaYHemoterapia } from "./specialties/hematologia-y-hemoterapia";
import { PROMPT as inmunologia } from "./specialties/inmunologia";
import { PROMPT as infectologia } from "./specialties/infectologia";
import { PROMPT as medicinaFamiliarYComunitaria } from "./specialties/medicina-familiar-y-comunitaria";
import { PROMPT as medicinaDelTrabajo } from "./specialties/medicina-del-trabajo";
import { PROMPT as medicinaPreventivaYSaludPublica } from "./specialties/medicina-preventiva-y-salud-publica";
import { PROMPT as medicinaCriticaIntensiva } from "./specialties/medicina-critica-intensiva";
import { PROMPT as neumologia } from "./specialties/neumologia";
import { PROMPT as nefrologia } from "./specialties/nefrologia";
import { PROMPT as neurologia } from "./specialties/neurologia";
import { PROMPT as oncologiaMedica } from "./specialties/oncologia-medica";
import { PROMPT as psiquiatria } from "./specialties/psiquiatria";
import { PROMPT as pediatria } from "./specialties/pediatria";
import { PROMPT as reumatologia } from "./specialties/reumatologia";
import { PROMPT as cirugiaGeneralYDelAparatoDigestivo } from "./specialties/cirugia-general-y-del-aparato-digestivo";
import { PROMPT as cirugiaCardiovascular } from "./specialties/cirugia-cardiovascular";
import { PROMPT as cirugiaToracica } from "./specialties/cirugia-toracica";
import { PROMPT as cirugiaPediatrica } from "./specialties/cirugia-pediatrica";
import { PROMPT as cirugiaPlasticaEsteticaYReparadora } from "./specialties/cirugia-plastica-estetica-y-reparadora";
import { PROMPT as cirugiaOralYMaxilofacial } from "./specialties/cirugia-oral-y-maxilofacial";
import { PROMPT as neurocirugia } from "./specialties/neurocirugia";
import { PROMPT as angiologiaYCirugiaVascular } from "./specialties/angiologia-y-cirugia-vascular";
import { PROMPT as oftalmologia } from "./specialties/oftalmologia";
import { PROMPT as otorrinolaringologia } from "./specialties/otorrinolaringologia";
import { PROMPT as anatomiaPatologica } from "./specialties/anatomia-patologica";
import { PROMPT as bioquimicaClinica } from "./specialties/bioquimica-clinica";
import { PROMPT as farmacologiaClinica } from "./specialties/farmacologia-clinica";
import { PROMPT as microbiologiaYParasitologia } from "./specialties/microbiologia-y-parasitologia";
import { PROMPT as medicinaNuclear } from "./specialties/medicina-nuclear";
import { PROMPT as neurofisiologiaClinica } from "./specialties/neurofisiologia-clinica";
import { PROMPT as radiodiagnostico } from "./specialties/radiodiagnostico";
import { PROMPT as medicinaTransfusionalYHemoterapia } from "./specialties/medicina-transfusional-y-hemoterapia";
import { PROMPT as medicinaDelDeporteMedicinaFisicaYRehabilitacion } from "./specialties/medicina-del-deporte-medicina-fisica-y-rehabilitacion";
import { PROMPT as medicinaLegalYForense } from "./specialties/medicina-legal-y-forense";
import { PROMPT as medicinaPaliativa } from "./specialties/medicina-paliativa";
import { PROMPT as medicinaAeroespacialMedicinaAeronautica } from "./specialties/medicina-aeroespacial-medicina-aeronautica";
import { PROMPT as hidrologiaMedica } from "./specialties/hidrologia-medica";

/**
 * Combined map of all specialty prompts.
 * Keys must match exactly the values in ESPECIALIDADES (src/schemas/auth.ts).
 */
const SPECIALTY_PROMPTS: Record<string, string> = {
  "Cirugía ortopédica y traumatología": cirugiaOrtopedicaYTraumatologia,
  "Cardiología": cardiologia,
  "Dermatología": dermatologia,
  "Dermatología médico-quirúrgica y venereología": dermatologiaMedicoQuirurgicaYVenereologia,
  "Obstetricia y ginecología": obstetriciaYGinecologia,
  "Urología": urologia,
  "Medicina interna": medicinaInterna,
  "Alergología": alergologia,
  "Anestesiología y reanimación": anestesiologiaYReanimacion,
  "Endocrinología y nutrición": endocrinologiaYNutricion,
  "Geriatría": geriatria,
  "Hematología y hemoterapia": hematologiaYHemoterapia,
  "Inmunología": inmunologia,
  "Infectología": infectologia,
  "Medicina familiar y comunitaria": medicinaFamiliarYComunitaria,
  "Medicina del trabajo": medicinaDelTrabajo,
  "Medicina preventiva y salud pública": medicinaPreventivaYSaludPublica,
  "Medicina crítica / intensiva": medicinaCriticaIntensiva,
  "Neumología": neumologia,
  "Nefrología": nefrologia,
  "Neurología": neurologia,
  "Oncología médica": oncologiaMedica,
  "Psiquiatría": psiquiatria,
  "Pediatría": pediatria,
  "Reumatología": reumatologia,
  "Cirugía general y del aparato digestivo": cirugiaGeneralYDelAparatoDigestivo,
  "Cirugía cardiovascular": cirugiaCardiovascular,
  "Cirugía torácica": cirugiaToracica,
  "Cirugía pediátrica": cirugiaPediatrica,
  "Cirugía plástica, estética y reparadora": cirugiaPlasticaEsteticaYReparadora,
  "Cirugía oral y maxilofacial": cirugiaOralYMaxilofacial,
  "Neurocirugía": neurocirugia,
  "Angiología y cirugía vascular": angiologiaYCirugiaVascular,
  "Oftalmología": oftalmologia,
  "Otorrinolaringología": otorrinolaringologia,
  "Anatomía patológica": anatomiaPatologica,
  "Bioquímica clínica": bioquimicaClinica,
  "Farmacología clínica": farmacologiaClinica,
  "Microbiología y parasitología": microbiologiaYParasitologia,
  "Medicina nuclear": medicinaNuclear,
  "Neurofisiología clínica": neurofisiologiaClinica,
  "Radiodiagnóstico": radiodiagnostico,
  "Medicina transfusional y hemoterapia": medicinaTransfusionalYHemoterapia,
  "Medicina del deporte / medicina física y rehabilitación": medicinaDelDeporteMedicinaFisicaYRehabilitacion,
  "Medicina legal y forense": medicinaLegalYForense,
  "Medicina paliativa": medicinaPaliativa,
  "Medicina aeroespacial / medicina aeronáutica": medicinaAeroespacialMedicinaAeronautica,
  "Hidrología médica": hidrologiaMedica,
};

const DEFAULT_PROMPT = `Eres médico especialista. Genera informes clínicos estructurados a partir de transcripciones de consultas.

# REGLAS
- NO inventes datos. Si no se menciona, indica "No registrado".
- Traduce lenguaje coloquial a terminología médica.
- Incluye códigos CIE-10 cuando el diagnóstico sea claro.
- Prescripciones: principio activo, dosis, vía, frecuencia y duración.
- Diagnósticos presuntivos: usar "sospecha clínica de" sin confirmación.
- Señala red flags explícitamente si están presentes.

# FORMATO DE SALIDA
1. Motivo de Consulta
2. Enfermedad Actual (cronología, OLDCARTS)
3. Antecedentes (personales, familiares, quirúrgicos, farmacológicos, alergias)
4. Examen Físico (hallazgos por sistemas)
5. Análisis (síndromes, diagnóstico presuntivo + diferenciales, CIE-10, red flags)
6. Plan (estudios, tratamiento, seguimiento, pautas de alarma)`;

/**
 * System prompt for patient-facing reports.
 * Used with Haiku for fast, simple language generation.
 */
export const PATIENT_REPORT_PROMPT = `Eres un asistente médico que genera informes para pacientes en lenguaje simple y cálido.

# REGLAS
- Lenguaje claro, sin jerga médica compleja.
- Tono cálido y tranquilizador.
- Si no hay contenido médico útil en la transcripción, devuelve informe vacío.

# SECCIONES DEL INFORME
1. Resumen de la consulta (qué se encontró)
2. Qué le pasa y por qué (explicación simple)
3. Medicamentos (nombre, para qué sirve, cuándo y cómo tomarlo)
4. Recomendaciones y cuidados
5. Señales de alarma (cuándo ir a urgencias)
6. Próximos pasos (controles, estudios pendientes)`;

/**
 * Returns the specialty-specific system prompt for a given especialidad.
 * Falls back to a comprehensive generic medical prompt if no match is found.
 */
export function getSpecialtyPrompt(especialidad: string | null | undefined): string {
  if (!especialidad) return DEFAULT_PROMPT;
  return SPECIALTY_PROMPTS[especialidad] || DEFAULT_PROMPT;
}
