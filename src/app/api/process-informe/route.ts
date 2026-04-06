import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { transcribeAudio } from "@/lib/transcribe";
import { getSpecialtyPrompt, PATIENT_REPORT_PROMPT } from "@/lib/prompts";

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

    // Run doctor and patient report generation in parallel for speed
    // Doctor: Sonnet with specialty prompt | Patient: Haiku with generic prompt
    const [doctorResponse, patientResponse] = await Promise.all([
      anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: specialtyPrompt,
        messages: [
          {
            role: "user",
            content: `Genera informe clínico de esta consulta. JSON puro (sin markdown):
{"valid_medical_content": true/false, "informe_doctor": "..."}

valid_medical_content=false si no hay info médica útil (ruido, pruebas de micrófono, etc). En ese caso informe_doctor="".
Sigue ESTRICTAMENTE el formato de salida de tus instrucciones de sistema.

TRANSCRIPCIÓN:
${transcript}`,
          },
        ],
      }),
      anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
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

    const doctorText = doctorResponse.content[0].type === "text" ? doctorResponse.content[0].text : "{}";
    const patientText = patientResponse.content[0].type === "text" ? patientResponse.content[0].text : "{}";

    let informeDoctor = "";
    let informePaciente = "";
    let validMedicalContent = true;

    // Parse doctor response
    try {
      const doctorJson = doctorText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(doctorJson ? doctorJson[0] : doctorText);
      validMedicalContent = parsed.valid_medical_content !== false;
      informeDoctor = parsed.informe_doctor || "";
    } catch {
      if (doctorText.trim().length > 50) informeDoctor = doctorText;
    }

    // Parse patient response
    try {
      const patientJson = patientText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(patientJson ? patientJson[0] : patientText);
      informePaciente = parsed.informe_paciente || "";
    } catch {
      if (patientText.trim().length > 50) informePaciente = patientText;
    }

    const hasReports = !!(informeDoctor.trim() || informePaciente.trim());
    const isInsufficientContent = !validMedicalContent && !hasReports;

    if (isInsufficientContent) {
      console.warn(`[process-informe] Insufficient medical content. validMedicalContent=${validMedicalContent}, hasReports=${hasReports}, transcript length=${trimmedTranscript.length}`);
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
      })
      .eq("id", informeId)
      .eq("doctor_id", user.id);

    if (updateError) throw new Error(updateError.message);

    revalidatePath("/");
    revalidatePath(`/informes/${informeId}`);

    // Fire-and-forget: extract dialog structure in background
    anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Analiza esta transcripción de consulta médica y extrae el diálogo estructurado.

TRANSCRIPCIÓN:
${transcript}

Responde en JSON puro (sin markdown):
{
  "transcript_type": "dialog" o "monologue",
  "dialog": [{"speaker": "doctor" o "paciente", "text": "..."}]
}

- "dialog" si hay dos personas conversando, "monologue" si solo habla el doctor
- Si es monologue, deja dialog como []
- Infiere quién habla por contexto: doctor pregunta/diagnostica, paciente describe síntomas
- Mantén el texto original sin modificar`,
        },
      ],
    }).then(async (dialogResponse) => {
      try {
        const dialogText = dialogResponse.content[0].type === "text" ? dialogResponse.content[0].text : "{}";
        const dialogJson = dialogText.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(dialogJson ? dialogJson[0] : dialogText);
        const transcriptType = parsed.transcript_type === "monologue" ? "monologue" : "dialog";
        const transcriptDialog = Array.isArray(parsed.dialog) && parsed.dialog.length > 0 ? parsed.dialog : null;
        await supabase
          .from("informes")
          .update({ transcript_dialog: transcriptDialog, transcript_type: transcriptType })
          .eq("id", informeId)
          .eq("doctor_id", user.id);
      } catch (e) {
        console.warn("[process-informe] Background dialog extraction failed:", e);
      }
    }).catch((e) => {
      console.warn("[process-informe] Background dialog extraction failed:", e);
    });

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
