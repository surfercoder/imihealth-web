import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { transcribeAudio } from "@/lib/transcribe";
import { getSpecialtyPrompt } from "@/lib/prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const formData = await request.formData();
  const informeId = formData.get("informeId") as string;
  const browserTranscript = (formData.get("browserTranscript") as string) || "";
  const language = (formData.get("language") as string) || "es";
  const audioFile = formData.get("audio") as File | null;

  if (!informeId) {
    return NextResponse.json({ error: "Falta el ID del informe" }, { status: 400 });
  }

  await supabase
    .from("informes")
    .update({ status: "processing" })
    .eq("id", informeId)
    .eq("doctor_id", user.id);

  try {
    // Transcribe audio with AssemblyAI for accurate medical transcription
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
        console.error("[process-informe] AssemblyAI transcription failed:", transcribeError);
      }
    }

    // Guard: if we have no usable transcript at all, abort early with a clear error
    const trimmedTranscript = transcript?.trim() || "";
    if (trimmedTranscript.length < 10) {
      console.warn(`[process-informe] Transcript too short to process (${trimmedTranscript.length} chars). assemblyAI=${assemblyAISucceeded}, browserTranscript length=${browserTranscript?.length || 0}`);
      await supabase
        .from("informes")
        .update({ status: "recording", transcript: null })
        .eq("id", informeId)
        .eq("doctor_id", user.id);

      return NextResponse.json({ transcriptionFailed: true });
    }

    console.info(`[process-informe] Processing transcript (${trimmedTranscript.length} chars, source=${assemblyAISucceeded ? "assemblyai" : "browser"})`);

    // Save transcript to DB and fetch doctor's specialty in parallel
    const [, doctorResult] = await Promise.all([
      supabase
        .from("informes")
        .update({ transcript })
        .eq("id", informeId)
        .eq("doctor_id", user.id),
      supabase
        .from("doctors")
        .select("especialidad")
        .eq("id", user.id)
        .single(),
    ]);

    const specialtyPrompt = getSpecialtyPrompt(doctorResult.data?.especialidad);

    const reportsResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-5-latest",
      max_tokens: 8192,
      system: specialtyPrompt,
      messages: [
        {
          role: "user",
          content: `Basándote en la siguiente transcripción de una consulta médica, genera DOS informes separados.

TRANSCRIPCIÓN:
${transcript}

---

IMPORTANTE: Primero determina si esta es una CONVERSACIÓN (diálogo entre doctor y paciente) o un MONÓLOGO (solo el doctor hablando sobre el caso del paciente).

Genera la respuesta en el siguiente formato JSON exacto (sin markdown, solo JSON puro):
{
  "valid_medical_content": true o false,
  "transcript_type": "dialog" o "monologue",
  "informe_doctor": "...",
  "informe_paciente": "...",
  "dialog": [...]
}

VALIDACIÓN DE CONTENIDO MÉDICO (valid_medical_content):
- true: La transcripción contiene información médica relevante (síntomas, diagnósticos, medicamentos, indicaciones, consultas médicas, etc.)
- false: La transcripción NO contiene información médica útil. Ejemplos: silencio, ruido de fondo, conversaciones no médicas, palabras sueltas sin sentido médico, pruebas de micrófono, etc.
- Si valid_medical_content es false, deja informe_doctor e informe_paciente como strings vacíos "" y dialog como []

TIPO DE TRANSCRIPCIÓN (transcript_type):
- "dialog": Si hay dos personas conversando (doctor haciendo preguntas y paciente respondiendo)
- "monologue": Si solo el doctor está hablando, narrando el caso del paciente

INFORME PARA EL DOCTOR (informe_doctor):
- Sigue ESTRICTAMENTE el formato de salida definido en tus instrucciones de sistema para esta especialidad
- Detallado y técnico, con terminología médica apropiada
- Incluye clasificaciones, scores y códigos CIE-10 según corresponda
- Formato estructurado con secciones claras usando saltos de línea

INFORME PARA EL PACIENTE (informe_paciente):
- Sigue las instrucciones para informe del paciente definidas en tus instrucciones de sistema
- Lenguaje simple y amigable, fácil de entender
- Incluye: resumen de la consulta, qué le pasa y por qué, medicamentos que debe tomar (nombre, para qué sirve, cuándo tomarlo), recomendaciones y cuidados, próximos pasos
- Tono cálido y tranquilizador
- Sin jerga médica compleja
- Formato claro con secciones usando saltos de línea

DIÁLOGO ESTRUCTURADO (dialog):
- SOLO si transcript_type es "dialog":
  - Divide la transcripción en turnos de habla individuales
  - Infiere quién habla basándote en el contexto: el doctor hace preguntas médicas, da diagnósticos y prescripciones; el paciente describe síntomas y responde preguntas
  - Cada elemento del array tiene "speaker" ("doctor" o "paciente") y "text" (lo que dijo)
  - Mantén el texto original sin modificaciones, solo segméntalo por turnos
- Si transcript_type es "monologue": deja el array "dialog" vacío []`,
        },
      ],
    });

    const reportsText =
      reportsResponse.content[0].type === "text"
        ? reportsResponse.content[0].text
        : "{}";

    let informeDoctor = "";
    let informePaciente = "";
    let transcriptDialog: Array<{ speaker: "doctor" | "paciente"; text: string }> | null = null;
    let transcriptType: "dialog" | "monologue" = "dialog";

    const jsonMatch = reportsText.match(/\{[\s\S]*\}/);
    let validMedicalContent = true;
    let jsonParsed = false;
    try {
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : reportsText);
      jsonParsed = true;
      validMedicalContent = parsed.valid_medical_content !== false;
      informeDoctor = parsed.informe_doctor || "";
      informePaciente = parsed.informe_paciente || "";
      transcriptType = parsed.transcript_type === "monologue" ? "monologue" : "dialog";
      if (Array.isArray(parsed.dialog) && parsed.dialog.length > 0) {
        transcriptDialog = parsed.dialog;
      }
    } catch (parseErr) {
      console.error("[process-informe] Failed to parse Claude JSON response:", parseErr);
      // If Claude returned text but we couldn't parse the JSON, use the raw text
      // as the doctor report rather than discarding it entirely
      if (reportsText.trim().length > 50) {
        informeDoctor = reportsText;
        informePaciente = reportsText;
      }
    }

    // Only flag as insufficient content if Claude explicitly said so AND reports are empty.
    // If we have reports with content, trust them regardless of the flag.
    const hasReports = !!(informeDoctor.trim() || informePaciente.trim());
    const isInsufficientContent = !validMedicalContent && !hasReports;

    if (isInsufficientContent) {
      console.warn(`[process-informe] Insufficient medical content. jsonParsed=${jsonParsed}, validMedicalContent=${validMedicalContent}, hasReports=${hasReports}, transcript length=${trimmedTranscript.length}`);
      await supabase
        .from("informes")
        .update({ status: "recording", transcript: null })
        .eq("id", informeId)
        .eq("doctor_id", user.id);

      return NextResponse.json({ insufficientContent: true });
    }

    const { error: updateError } = await supabase
      .from("informes")
      .update({
        status: "completed",
        informe_doctor: informeDoctor,
        informe_paciente: informePaciente,
        transcript_dialog: transcriptDialog,
        transcript_type: transcriptType,
      })
      .eq("id", informeId)
      .eq("doctor_id", user.id);

    if (updateError) throw new Error(updateError.message);

    revalidatePath("/");
    revalidatePath(`/informes/${informeId}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    await supabase
      .from("informes")
      .update({ status: "error" })
      .eq("id", informeId)
      .eq("doctor_id", user.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
