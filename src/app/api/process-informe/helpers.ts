import * as Sentry from "@sentry/nextjs";
import Anthropic from "@anthropic-ai/sdk";
import { transcribeAudio } from "@/lib/transcribe";
import { PATIENT_REPORT_PROMPT } from "@/lib/prompts";
import { ANTHROPIC_MODEL } from "@/lib/ai-model";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface TranscriptionResult {
  transcript: string;
  assemblyAISucceeded: boolean;
}

/**
 * Attempts to transcribe an audio source via AssemblyAI, falling back to the
 * provided browser transcript on empty result or error. Accepts any object
 * exposing `.size` and `.arrayBuffer()` (both `File` and `Blob` qualify).
 */
export async function resolveTranscript(
  audioFile: Blob | File | null,
  browserTranscript: string,
  language: string,
): Promise<TranscriptionResult> {
  let transcript = browserTranscript;
  let assemblyAISucceeded = false;
  if (audioFile && audioFile.size > 0) {
    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      const langCode = language === "en" ? "en" : "es";
      const result = await transcribeAudio(audioBuffer, langCode);
      if (result.text && result.text.trim().length > 0) {
        transcript = result.text;
        assemblyAISucceeded = true;
      } else {
        console.warn("[process-informe] AssemblyAI returned empty transcript");
      }
    } catch (transcribeError) {
      Sentry.captureException(transcribeError, {
        tags: { flow: "assemblyai-transcription" },
      });
      console.error("[process-informe] AssemblyAI transcription failed:", transcribeError);
    }
  }
  return { transcript, assemblyAISucceeded };
}

interface DoctorParseResult {
  informeDoctor: string;
  validMedicalContent: boolean;
}

/**
 * Extracts a JSON string field value from (possibly truncated) JSON text.
 * Walks the string honoring escape sequences and stops at the closing quote
 * OR at end-of-text — so truncated model output still yields the partial body
 * instead of a parse error.
 */
function extractJsonStringField(text: string, field: string): string | null {
  const re = new RegExp(`"${field}"\\s*:\\s*"`);
  const m = re.exec(text);
  if (!m) return null;
  let i = m.index + m[0].length;
  let out = "";
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\" && i + 1 < text.length) {
      const next = text[i + 1];
      if (next === "n") out += "\n";
      else if (next === "t") out += "\t";
      else if (next === "r") out += "\r";
      else if (next === '"') out += '"';
      else if (next === "\\") out += "\\";
      else if (next === "/") out += "/";
      else out += next;
      i += 2;
    } else if (ch === '"') {
      break;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

/**
 * Coerces an arbitrary value extracted from a parsed JSON response into a
 * plain string. Anthropic occasionally returns object/array shapes for fields
 * we asked for as strings (especially when the system prompt biases it toward
 * structured output). For object/array values we render them as readable
 * markdown rather than discarding the content.
 */
function coerceReportField(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (typeof value === "object") return renderObjectAsMarkdown(value as object);
  // Numbers, booleans, and any other primitive — coerce via String().
  return String(value);
}

/**
 * Title-cases a snake_case key, e.g. "datos_del_encuentro" → "Datos Del Encuentro".
 */
function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Recursively renders an arbitrary JSON value as readable markdown.
 * Used as a fallback when the model returns a structured object instead of
 * the expected markdown string. Top-level object keys become **bold headers**;
 * nested objects render as indented bullets; arrays render as bullet lists.
 */
function renderValueAsMarkdown(value: unknown, depth: number): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const items = value
      .map((item) => renderValueAsMarkdown(item, depth + 1))
      .filter((s) => s.trim().length > 0);
    if (items.length === 0) return "";
    // If array of primitives, render inline; otherwise as bulleted list.
    const allPrimitive = value.every(
      (v) => v == null || typeof v !== "object",
    );
    if (allPrimitive) return items.join(", ");
    return items.map((it) => `${"  ".repeat(depth)}- ${it}`).join("\n");
  }
  if (typeof value === "object") {
    const lines: string[] = [];
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const rendered = renderValueAsMarkdown(v, depth + 1);
      if (!rendered.trim()) continue;
      const label = humanizeKey(k);
      if (rendered.includes("\n")) {
        lines.push(`${"  ".repeat(depth)}- **${label}:**\n${rendered}`);
      } else {
        lines.push(`${"  ".repeat(depth)}- **${label}:** ${rendered}`);
      }
    }
    return lines.join("\n");
  }
  // Primitive number/boolean — coerce via String().
  return String(value);
}

function renderObjectAsMarkdown(obj: object): string {
  if (Array.isArray(obj)) return renderValueAsMarkdown(obj, 0);
  const sections: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const rendered = renderValueAsMarkdown(v, 0);
    if (!rendered.trim()) continue;
    sections.push(`**${humanizeKey(k).toUpperCase()}**\n${rendered}`);
  }
  return sections.join("\n\n");
}

/**
 * When the model returns a parsed JSON object with no `informe_doctor` field
 * but the object itself looks like a clinical-report structure (e.g. has keys
 * like `objetivo`, `evaluacion`, `plan`, etc.), convert the whole
 * object into a markdown report so the doctor sees something usable.
 */
function looksLikeClinicalStructure(obj: Record<string, unknown>): boolean {
  const knownKeys = [
    "objetivo",
    "evaluacion",
    "plan",
    "datos_del_encuentro",
    "anamnesis",
    "exploracion_fisica",
    "diagnostico",
    "tratamiento",
    "valoracion",
  ];
  const keys = Object.keys(obj).map((k) => k.toLowerCase());
  return knownKeys.some((k) => keys.includes(k));
}

/**
 * Parses the doctor Claude response, extracting the informe and the
 * valid_medical_content flag. If the JSON is malformed/truncated, falls back
 * to a string-aware extractor so we never persist raw JSON as the report.
 */
export function parseDoctorResponse(doctorText: string): DoctorParseResult {
  let informeDoctor = "";
  let validMedicalContent = true;
  try {
    const doctorJson = doctorText.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(doctorJson ? doctorJson[0] : doctorText);
    validMedicalContent = parsed.valid_medical_content !== false;
    informeDoctor = coerceReportField(parsed.informe_doctor);
    // Fallback: model ignored the wrapper and returned the clinical structure
    // directly (e.g. {datos_del_encuentro: {...}, objetivo: {...}, ...}).
    // Render the whole parsed object as markdown so the doctor still gets a
    // readable report.
    if (
      !informeDoctor.trim() &&
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      looksLikeClinicalStructure(parsed as Record<string, unknown>)
    ) {
      informeDoctor = renderObjectAsMarkdown(parsed);
    }
  } catch {
    const extracted = extractJsonStringField(doctorText, "informe_doctor");
    if (extracted && extracted.trim().length > 0) {
      informeDoctor = extracted;
      validMedicalContent = !/"valid_medical_content"\s*:\s*false/.test(doctorText);
    } else if (doctorText.trim().length > 50 && !doctorText.trim().startsWith("{")) {
      informeDoctor = doctorText;
    }
  }
  return { informeDoctor, validMedicalContent };
}

/**
 * Parses the patient Claude response. If the JSON is malformed/truncated,
 * falls back to a string-aware extractor so we never persist raw JSON.
 */
export function parsePatientResponse(patientText: string): string {
  let informePaciente = "";
  try {
    const patientJson = patientText.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(patientJson ? patientJson[0] : patientText);
    informePaciente = coerceReportField(parsed.informe_paciente);
  } catch {
    const extracted = extractJsonStringField(patientText, "informe_paciente");
    if (extracted && extracted.trim().length > 0) {
      informePaciente = extracted;
    } else if (patientText.trim().length > 50 && !patientText.trim().startsWith("{")) {
      informePaciente = patientText;
    }
  }
  return informePaciente;
}

export function extractTextFromContent(
  response: { content: Array<{ type: string; text?: string }> },
): string {
  return response.content[0].type === "text" ? response.content[0].text ?? "{}" : "{}";
}

/**
 * Generates the doctor report only. Used by both the classic flow (in parallel
 * with the patient report) and the quick-informe flow (which doesn't need a
 * patient report). Keeping this in one place ensures both flows produce the
 * exact same doctor-report format.
 */
export function generateDoctorReport(
  transcript: string,
  specialtyPrompt: string,
) {
  return anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    system: specialtyPrompt,
    messages: [
      {
        role: "user",
        content: `Genera el informe clínico de esta consulta.

REGLAS DE SALIDA (OBLIGATORIAS):
1. Devolvé EXCLUSIVAMENTE un objeto JSON con esta forma exacta:
   {"valid_medical_content": true, "informe_doctor": "<texto>"}
2. "informe_doctor" DEBE ser SIEMPRE un string (NUNCA un objeto, NUNCA un array). El string contiene el informe completo formateado en Markdown según el FORMATO DE SALIDA de tus instrucciones de sistema. Usá \\n para los saltos de línea dentro del string.
3. NO envuelvas el JSON en bloques de código markdown. NO agregues texto antes ni después del JSON.
4. Si no hay información médica útil (ruido, prueba de micrófono, etc), devolvé exactamente: {"valid_medical_content": false, "informe_doctor": ""}

EJEMPLO DE RESPUESTA VÁLIDA:
{"valid_medical_content": true, "informe_doctor": "**DATOS DEL ENCUENTRO**\\nConsulta de control...\\n\\n**O - OBJETIVO**\\n..."}

TRANSCRIPCIÓN:
${transcript}`,
      },
    ],
  });
}

/**
 * Generates the doctor and patient reports in parallel.
 */
export async function generateReports(
  transcript: string,
  specialtyPrompt: string,
): Promise<{ doctorText: string; patientText: string }> {
  const [doctorResponse, patientResponse] = await Promise.all([
    generateDoctorReport(transcript, specialtyPrompt),
    anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: PATIENT_REPORT_PROMPT,
      messages: [
        {
          role: "user",
          content: `Genera informe para el paciente de esta consulta. JSON puro (sin markdown):
{"informe_paciente": "..."}

Si no hay info médica útil, informe_paciente="".

TRANSCRIPCIÓN:
${transcript}`,
        },
      ],
    }),
  ]);

  return {
    doctorText: extractTextFromContent(doctorResponse),
    patientText: extractTextFromContent(patientResponse),
  };
}
