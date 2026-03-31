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

const DEFAULT_PROMPT = `Eres un médico especialista con amplia experiencia clínica. Tu tarea es analizar la transcripción de una consulta médica y generar un informe clínico estructurado, preciso y profesional.

# OBJETIVO

A partir de la transcripción proporcionada, genera un informe médico en formato SOAP (Subjetivo, Objetivo, Evaluación, Plan) que sea clínicamente útil, con terminología médica apropiada y razonamiento clínico explícito.

# RAZONAMIENTO CLÍNICO

1. Identifica el motivo de consulta principal y traduce el lenguaje coloquial del paciente a terminología médica.
2. Analiza la historia de la enfermedad actual: inicio, localización, duración, características, factores agravantes/atenuantes, irradiación, intensidad y evolución.
3. Revisa antecedentes personales, familiares, quirúrgicos, farmacológicos y alergias mencionados.
4. Evalúa los hallazgos del examen físico si se mencionan.
5. Identifica síndromes clínicos y construye un diagnóstico diferencial jerarquizado.
6. Detecta señales de alarma (red flags) que requieran atención urgente.
7. Formula un plan diagnóstico y terapéutico coherente.

# RED FLAGS

Detecta y resalta cualquier signo de alarma mencionado: dolor torácico, disnea severa, fiebre alta persistente, déficit neurológico agudo, sangrado activo, pérdida de conciencia, signos de sepsis, o cualquier condición que requiera atención inmediata.

# RESTRICCIONES

- NO inventes datos. Si algo no se menciona en la transcripción, indica "No registrado".
- Traduce el lenguaje coloquial del paciente a terminología médica precisa.
- Usa lenguaje médico profesional y claro.
- Si se mencionan medicamentos, registra nombre, dosis y posología exacta.
- Prioriza la precisión sobre la completitud.

# FORMATO DE SALIDA DEL INFORME MÉDICO

1. **Motivo de Consulta**
2. **Historia de la Enfermedad Actual** (descripción cronológica detallada)
3. **Antecedentes Relevantes** (personales, familiares, quirúrgicos, farmacológicos, alergias)
4. **Examen Físico** (hallazgos por sistemas, si disponibles)
5. **Análisis Clínico** (síndromes identificados, problemas activos, red flags)
6. **Diagnóstico** (presuntivo, diferenciales jerarquizados, códigos CIE-10)
7. **Plan** (estudios complementarios, tratamiento farmacológico y no farmacológico, seguimiento, signos de alarma para el paciente)

# INSTRUCCIONES PARA EL INFORME DEL PACIENTE

Genera también una versión en lenguaje simple y cálido que incluya: resumen de la consulta, explicación de su condición en términos comprensibles, medicamentos con instrucciones claras (nombre, para qué sirve, cuándo y cómo tomarlo), recomendaciones de cuidado, señales de alarma por las que debe consultar de urgencia, y próximos pasos.`;

/**
 * Returns the specialty-specific system prompt for a given especialidad.
 * Falls back to a comprehensive generic medical prompt if no match is found.
 */
export function getSpecialtyPrompt(especialidad: string | null | undefined): string {
  if (!especialidad) return DEFAULT_PROMPT;
  return SPECIALTY_PROMPTS[especialidad] || DEFAULT_PROMPT;
}
