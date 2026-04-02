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
      model: "claude-opus-4-5",
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
      model: "claude-opus-4-5",
      max_tokens: 8192,
      system: specialtyPrompt,
      messages: [
        {
          role: "user",
          content: `El doctor ha editado los informes generados previamente. Basándote en la transcripción original y las ediciones del doctor, regenera ambos informes incorporando los cambios y siguiendo el formato de tu especialidad.

TRANSCRIPCIÓN ORIGINAL:
${informeData.transcript}

INFORME DOCTOR (editado):
${editedDoctor}

INFORME PACIENTE (editado):
${editedPaciente}

Genera la respuesta en formato JSON exacto (sin markdown, solo JSON puro):
{
  "informe_doctor": "...",
  "informe_paciente": "..."
}

Mantén las ediciones del doctor como base, mejorando coherencia y formato según el estándar de la especialidad.`,
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
