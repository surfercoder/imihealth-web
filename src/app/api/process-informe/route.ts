import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getSpecialtyPrompt } from "@/lib/prompts";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  resolveTranscript,
  parseDoctorResponse,
  parsePatientResponse,
  generateReports,
} from "./helpers";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { allowed, retryAfter } = checkRateLimit(user.id, {
    key: "process-informe",
    limit: 10,
    windowSeconds: 60,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const body = await request.json();
  const informeId = body.informeId as string;
  const browserTranscript = (body.browserTranscript as string) || "";
  const language = (body.language as string) || "es";
  const audioPath = (body.audioPath as string) || null;
  const recordingDuration = body.recordingDuration != null ? Number(body.recordingDuration) : null;

  if (!informeId) {
    return NextResponse.json({ error: "Falta el ID del informe" }, { status: 400 });
  }

  await supabase
    .from("informes")
    .update({ status: "processing" })
    .eq("id", informeId)
    .eq("doctor_id", user.id);

  try {
    // Download audio from Supabase Storage so we can pass a Buffer to AssemblyAI
    let audioBuffer: Buffer | null = null;
    if (audioPath) {
      const { data: audioData, error: downloadError } = await supabase.storage
        .from("audio-recordings")
        .download(audioPath);
      if (downloadError) {
        console.warn(`[process-informe] Storage download failed: ${downloadError.message}`);
      } else if (audioData) {
        audioBuffer = Buffer.from(await audioData.arrayBuffer());
      }
    }

    const { transcript, assemblyAISucceeded } = await resolveTranscript(
      audioBuffer,
      browserTranscript,
      language,
    );

    // Guard: if we have no usable transcript at all, abort early with a clear error
    const trimmedTranscript = transcript?.trim() || "";
    if (trimmedTranscript.length < 10) {
      console.warn(`[process-informe] Transcript too short to process (${trimmedTranscript.length} chars). assemblyAI=${assemblyAISucceeded}, browserTranscript length=${browserTranscript?.length || 0}`);
      await supabase
        .from("informes")
        .update({ status: "recording" })
        .eq("id", informeId)
        .eq("doctor_id", user.id);

      return NextResponse.json({ transcriptionFailed: true });
    }

    console.info(`[process-informe] Processing transcript (${trimmedTranscript.length} chars, source=${assemblyAISucceeded ? "assemblyai" : "browser"})`);

    const { data: doctorResult } = await supabase
      .from("doctors")
      .select("especialidad")
      .eq("id", user.id)
      .single();

    const specialtyPrompt = getSpecialtyPrompt(doctorResult?.especialidad);

    const { doctorText, patientText } = await generateReports(transcript, specialtyPrompt);

    const { informeDoctor, validMedicalContent } = parseDoctorResponse(doctorText);
    const informePaciente = parsePatientResponse(patientText);

    const hasReports = !!(informeDoctor.trim() || informePaciente.trim());
    const isInsufficientContent = !validMedicalContent && !hasReports;

    if (isInsufficientContent) {
      console.warn(`[process-informe] Insufficient medical content. validMedicalContent=${validMedicalContent}, hasReports=${hasReports}, transcript length=${trimmedTranscript.length}`);
      await supabase
        .from("informes")
        .update({ status: "recording" })
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
        ...(recordingDuration != null && { recording_duration: recordingDuration }),
      })
      .eq("id", informeId)
      .eq("doctor_id", user.id);

    if (updateError) throw new Error(updateError.message);

    revalidatePath("/");
    revalidatePath(`/informes/${informeId}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { flow: "process-informe" },
      extra: { informeId },
    });
    const message = err instanceof Error ? err.message : "Error desconocido";
    await supabase
      .from("informes")
      .update({ status: "error" })
      .eq("id", informeId)
      .eq("doctor_id", user.id);
    return NextResponse.json({ error: message }, { status: 500 });
    /* v8 ignore next */
  } finally {
    // Always remove the temporary audio so the bucket stays empty after processing.
    if (audioPath) {
      const { error: removeError } = await supabase.storage
        .from("audio-recordings")
        .remove([audioPath]);
      if (removeError) {
        console.warn(`[process-informe] Storage cleanup failed: ${removeError.message}`);
      }
    }
  }
}
