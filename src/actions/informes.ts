"use server";

import { createClient } from "@/utils/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { transcribeAudio } from "@/lib/transcribe";
import { MVP_LIMITS } from "@/lib/mvp-limits";
import { getSpecialtyPrompt } from "@/lib/prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function createPatient(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const name = formData.get("name") as string;
  const dni = formData.get("dni") as string;
  const dob = (formData.get("dob") as string) || null;
  /* v8 ignore next */
  const phone = (formData.get("phone") as string) || null;
  const email = formData.get("email") as string;
  const affiliateNumber = formData.get("affiliateNumber") as string;

  const { data, error } = await supabase
    .from("patients")
    .insert({
      doctor_id: user.id,
      name: name.trim(),
      dni: dni.trim(),
      dob: dob?.trim() || null,
      /* v8 ignore next 3 */
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      affiliate_number: affiliateNumber?.trim() || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function createInforme(patientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // MVP informe limit check
  const { count: informeCount } = await supabase
    .from("informes")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", user.id);
  if ((informeCount ?? 0) >= MVP_LIMITS.MAX_INFORMES_PER_DOCTOR) {
    return { error: `Has alcanzado el límite de ${MVP_LIMITS.MAX_INFORMES_PER_DOCTOR} informes para la prueba MVP.` };
  }

  const { data, error } = await supabase
    .from("informes")
    .insert({
      doctor_id: user.id,
      patient_id: patientId,
      status: "recording",
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function processInformeFromTranscript(
  informeId: string,
  browserTranscript: string,
  audioBase64?: string,
  audioContentType?: string,
  language: string = "es"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  await supabase
    .from("informes")
    .update({ status: "processing" })
    .eq("id", informeId)
    .eq("doctor_id", user.id);

  try {
    // Transcribe audio with AssemblyAI for accurate medical transcription
    let transcript = browserTranscript;
    if (audioBase64) {
      try {
        const audioBuffer = Buffer.from(audioBase64, "base64");
        /* v8 ignore next */
        const langCode = language === "en" ? "en" : "es";
        const result = await transcribeAudio(audioBuffer, langCode);
        if (result.text) {
          transcript = result.text;
        }
      } catch (transcribeError) {
        console.warn("AssemblyAI transcription failed, falling back to browser transcript:", transcribeError);
        // Continue with browser transcript as fallback
      }
    }

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
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: specialtyPrompt,
      messages: [
        {
          role: "user",
          content: `Genera DOS informes de esta consulta médica. JSON puro (sin markdown):
{"valid_medical_content": true/false, "transcript_type": "dialog"/"monologue", "informe_doctor": "...", "informe_paciente": "...", "dialog": [...]}

- valid_medical_content=false si no hay info médica útil (ruido, pruebas, etc). En ese caso todos los campos vacíos.
- transcript_type: "dialog" si conversan doctor y paciente, "monologue" si solo habla el doctor.
- informe_doctor: Sigue ESTRICTAMENTE el formato de tus instrucciones de sistema. Técnico, con CIE-10 y scores.
- informe_paciente: Lenguaje simple y cálido. Incluye resumen, medicamentos (nombre, para qué, cuándo), recomendaciones y próximos pasos.
- dialog: Si es dialog, array de {"speaker":"doctor"/"paciente","text":"..."}. Si monologue, [].

TRANSCRIPCIÓN:
${transcript}`,
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
    try {
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : reportsText);
      validMedicalContent = parsed.valid_medical_content !== false;
      informeDoctor = parsed.informe_doctor || "";
      informePaciente = parsed.informe_paciente || "";
      /* v8 ignore next */
      transcriptType = parsed.transcript_type === "monologue" ? "monologue" : "dialog";
      if (Array.isArray(parsed.dialog) && parsed.dialog.length > 0) {
        transcriptDialog = parsed.dialog;
      }
    } catch {
      informeDoctor = reportsText;
      informePaciente = reportsText;
    }

    // If Claude determined there's no valid medical content, reset the informe and abort
    if (!validMedicalContent || (!informeDoctor.trim() && !informePaciente.trim())) {
      // Reset informe back to "recording" status so it doesn't pollute the DB
      await supabase
        .from("informes")
        .update({ status: "recording", transcript: null })
        .eq("id", informeId)
        .eq("doctor_id", user.id);

      return { insufficientContent: true };
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
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    await supabase
      .from("informes")
      .update({ status: "error" })
      .eq("id", informeId)
      .eq("doctor_id", user.id);
    return { error: message };
  }
}

export async function deleteInforme(informeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: informe, error: fetchError } = await supabase
    .from("informes")
    .select("id, patient_id")
    .eq("id", informeId)
    .eq("doctor_id", user.id)
    .single();

  if (fetchError || !informe) return { error: "Informe no encontrado" };

  const { error: deleteError } = await supabase
    .from("informes")
    .delete()
    .eq("id", informeId)
    .eq("doctor_id", user.id);

  if (deleteError) return { error: deleteError.message };

  revalidatePath("/");
  revalidatePath(`/patients/${informe.patient_id}`);
  return { success: true };
}

export async function getInformes() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data, error } = await supabase
    .from("informes")
    .select("*, patients(name, phone, email)")
    .eq("doctor_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data };
}

export async function getInforme(informeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data, error } = await supabase
    .from("informes")
    .select("*, patients(name, phone, email, dob)")
    .eq("id", informeId)
    .eq("doctor_id", user.id)
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function updateInformeDoctorOnly(
  informeId: string,
  informeDoctor: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error: updateError } = await supabase
    .from("informes")
    .update({ informe_doctor: informeDoctor })
    .eq("id", informeId)
    .eq("doctor_id", user.id);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/informes/${informeId}`);
  return { success: true };
}

export async function updateInformePacienteWithPdf(
  informeId: string,
  informePaciente: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error: updateError } = await supabase
    .from("informes")
    .update({ informe_paciente: informePaciente })
    .eq("id", informeId)
    .eq("doctor_id", user.id);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/informes/${informeId}`);
  return { success: true };
}

export async function updateInformeReports(
  informeId: string,
  informeDoctor: string,
  informePaciente: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error: updateError } = await supabase
    .from("informes")
    .update({ informe_doctor: informeDoctor, informe_paciente: informePaciente })
    .eq("id", informeId)
    .eq("doctor_id", user.id);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/informes/${informeId}`);
  return { success: true };
}

export async function regenerateReportFromEdits(
  informeId: string,
  editedDoctor: string,
  editedPaciente: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const [informeResult, doctorResult] = await Promise.all([
    supabase
      .from("informes")
      .select("id, transcript")
      .eq("id", informeId)
      .eq("doctor_id", user.id)
      .single(),
    supabase
      .from("doctors")
      .select("especialidad")
      .eq("id", user.id)
      .single(),
  ]);

  const { data: informeData, error: fetchError } = informeResult;

  if (fetchError || !informeData) return { error: "Informe no encontrado" };
  if (!informeData.transcript) return { error: "No hay transcripción disponible" };

  /* v8 ignore next */
  const specialtyPrompt = getSpecialtyPrompt(doctorResult.data?.especialidad);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: specialtyPrompt,
      messages: [
        {
          role: "user",
          content: `Regenera ambos informes incorporando las ediciones del doctor. JSON puro (sin markdown):
{"informe_doctor": "...", "informe_paciente": "..."}

Mantén las ediciones como base, mejorando coherencia y formato según la especialidad.

TRANSCRIPCIÓN ORIGINAL:
${informeData.transcript}

INFORME DOCTOR (editado):
${editedDoctor}

INFORME PACIENTE (editado):
${editedPaciente}`,
        },
      ],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "{}";

    let finalDoctor = editedDoctor;
    let finalPaciente = editedPaciente;

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    try {
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
      if (parsed.informe_doctor) finalDoctor = parsed.informe_doctor;
      if (parsed.informe_paciente) finalPaciente = parsed.informe_paciente;
    } catch {
      // Fall back to edited versions
    }

    return await updateInformeReports(informeId, finalDoctor, finalPaciente);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { error: message };
  }
}

export async function recordPatientConsent(informeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: informeData, error: fetchError } = await supabase
    .from("informes")
    .select("*, patients(*)")
    .eq("id", informeId)
    .eq("doctor_id", user.id)
    .single();

  if (fetchError || !informeData) return { error: "Informe no encontrado" };
  if (informeData.status !== "completed") return { error: "El informe no está completado" };
  if (!informeData.informe_paciente) return { error: "Sin contenido para el paciente" };

  const consentAt = new Date().toLocaleString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const { error: updateError } = await supabase
    .from("informes")
    .update({ patient_consent: true, patient_consent_at: new Date().toISOString() })
    .eq("id", informeId)
    .eq("doctor_id", user.id);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/informes/${informeId}`);
  return { success: true, consentAt };
}

export async function generateAndSaveCertificado(
  informeId: string,
  options: {
    daysOff?: number | null;
    diagnosis?: string | null;
    observations?: string | null;
  } = {}
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: informeData, error: fetchError } = await supabase
    .from("informes")
    .select("status")
    .eq("id", informeId)
    .eq("doctor_id", user.id)
    .single();

  if (fetchError || !informeData) return { error: "Informe no encontrado" };
  if (informeData.status !== "completed") return { error: "El informe no está completado" };

  // Build on-demand PDF URL with options as query params
  const params = new URLSearchParams({ id: informeId });
  if (options.daysOff != null) params.set("daysOff", String(options.daysOff));
  if (options.diagnosis) params.set("diagnosis", options.diagnosis);
  if (options.observations) params.set("observations", options.observations);

  return { signedUrl: `/api/pdf/certificado?${params.toString()}` };
}
