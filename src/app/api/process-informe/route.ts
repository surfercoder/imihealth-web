import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getSpecialtyPrompt } from "@/lib/prompts";
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
    const { transcript, assemblyAISucceeded } = await resolveTranscript(
      audioFile,
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
