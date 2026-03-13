"use server";

import { createClient } from "@/utils/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { generateInformePDF, generateCertificadoPDF } from "@/lib/pdf";
import { revalidatePath } from "next/cache";
import { transcribeAudio } from "@/lib/transcribe";
import { MVP_LIMITS } from "@/lib/mvp-limits";

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
  audioPath?: string,
  language: string = "es"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  await supabase
    .from("informes")
    .update({ status: "processing", audio_path: audioPath ?? null })
    .eq("id", informeId)
    .eq("doctor_id", user.id);

  try {
    // Transcribe audio with AssemblyAI for accurate medical transcription
    let transcript = browserTranscript;
    if (audioPath) {
      try {
        const { data: audioData, error: downloadError } = await supabase.storage
          .from("audio-recordings")
          .download(audioPath);

        if (!downloadError && audioData) {
          const arrayBuffer = await audioData.arrayBuffer();
          const audioBuffer = Buffer.from(arrayBuffer);
          /* v8 ignore next */
          const langCode = language === "en" ? "en" : "es";
          const result = await transcribeAudio(audioBuffer, langCode);
          if (result.text) {
            transcript = result.text;
          }
        }
      } catch (transcribeError) {
        console.warn("AssemblyAI transcription failed, falling back to browser transcript:", transcribeError);
        // Continue with browser transcript as fallback
      }
    }

    // Save transcript to DB
    await supabase
      .from("informes")
      .update({ transcript })
      .eq("id", informeId)
      .eq("doctor_id", user.id);

    const reportsResponse = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `Eres un asistente médico experto. Basándote en la siguiente transcripción de una consulta médica, genera DOS informes separados.

TRANSCRIPCIÓN:
${transcript}

---

IMPORTANTE: Primero determina si esta es una CONVERSACIÓN (diálogo entre doctor y paciente) o un MONÓLOGO (solo el doctor hablando sobre el caso del paciente).

Genera la respuesta en el siguiente formato JSON exacto (sin markdown, solo JSON puro):
{
  "transcript_type": "dialog" o "monologue",
  "informe_doctor": "...",
  "informe_paciente": "...",
  "dialog": [...]
}

TIPO DE TRANSCRIPCIÓN (transcript_type):
- "dialog": Si hay dos personas conversando (doctor haciendo preguntas y paciente respondiendo)
- "monologue": Si solo el doctor está hablando, narrando el caso del paciente

INFORME PARA EL DOCTOR (informe_doctor):
- Detallado y técnico
- Incluye: motivo de consulta, anamnesis, síntomas reportados, diagnóstico presuntivo, medicamentos recetados con dosis y frecuencia, indicaciones, próximos pasos y seguimiento
- Usa terminología médica apropiada
- Formato estructurado con secciones claras usando saltos de línea

INFORME PARA EL PACIENTE (informe_paciente):
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
    try {
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : reportsText);
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

    const { data: informeData } = await supabase
      .from("informes")
      .select("*, patients(*)")
      .eq("id", informeId)
      .single();

    let pdfPath: string | null = null;
    if (informeData && informePaciente) {
      try {
        const patient = (informeData as { patients: { name: string; phone: string } }).patients;
        const pdfBytes = await generateInformePDF({
          patientName: patient.name,
          patientPhone: patient.phone,
          date: new Date().toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }),
          content: informePaciente,
        });

        const pdfFileName = `${user.id}/${informeId}/informe-paciente.pdf`;
        const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
        const { error: pdfUploadError } = await supabase.storage
          .from("informes-pdf")
          .upload(pdfFileName, pdfBlob, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (!pdfUploadError) {
          pdfPath = pdfFileName;
        }
      /* v8 ignore next 3 */
      } catch (pdfError) {
        console.error("Error generando PDF:", pdfError);
      }
    }

    const finalUpdate: Record<string, unknown> = {
      status: "completed",
      informe_doctor: informeDoctor,
      informe_paciente: informePaciente,
      pdf_path: pdfPath,
      transcript_dialog: transcriptDialog,
      transcript_type: transcriptType,
    };

    // Clear audio_path in the same update (legal compliance)
    if (audioPath) {
      finalUpdate.audio_path = null;
    }

    const { error: updateError } = await supabase
      .from("informes")
      .update(finalUpdate)
      .eq("id", informeId)
      .eq("doctor_id", user.id);

    if (updateError) throw new Error(updateError.message);

    // Delete audio file from storage after reports are generated (legal compliance)
    if (audioPath) {
      try {
        await supabase.storage.from("audio-recordings").remove([audioPath]);
      } catch {
        // Storage deletion is best-effort; the audio_path has already been nullified in the DB
      }
    }

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
    .select("id, audio_path, pdf_path, patient_id")
    .eq("id", informeId)
    .eq("doctor_id", user.id)
    .single();

  if (fetchError || !informe) return { error: "Informe no encontrado" };

  if (informe.audio_path) {
    await supabase.storage.from("audio-recordings").remove([informe.audio_path]);
  }

  if (informe.pdf_path) {
    await supabase.storage.from("informes-pdf").remove([informe.pdf_path]);
  }

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

export async function getPdfDownloadUrl(pdfPath: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("informes-pdf")
    .createSignedUrl(pdfPath, 3600);
  return data?.signedUrl ?? null;
}

export async function regeneratePdf(informeId: string) {
  await generateAndSavePdf(informeId);
  revalidatePath(`/informes/${informeId}`);
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

  const { data: informeData, error: fetchError } = await supabase
    .from("informes")
    .select("*, patients(*)")
    .eq("id", informeId)
    .eq("doctor_id", user.id)
    .single();

  if (fetchError || !informeData) return { error: "Informe no encontrado" };

  const { data: doctorData } = await supabase
    .from("doctors")
    .select("name, matricula, especialidad, firma_digital")
    .eq("id", user.id)
    .single();

  let pdfPath: string | null = informeData.pdf_path ?? null;

  if (informePaciente) {
    try {
      const patient = (informeData as { patients: { name: string; phone: string } }).patients;
      const pdfBytes = await generateInformePDF({
        patientName: patient.name,
        patientPhone: patient.phone,
        date: new Date(informeData.created_at).toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        content: informePaciente,
        doctor: doctorData
          ? {
              name: doctorData.name,
              matricula: doctorData.matricula,
              especialidad: doctorData.especialidad,
              firmaDigital: doctorData.firma_digital,
            }
          : null,
      });

      const pdfFileName = `${user.id}/${informeId}/informe-paciente.pdf`;
      const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const { error: uploadError } = await supabase.storage
        .from("informes-pdf")
        .upload(pdfFileName, pdfBlob, { contentType: "application/pdf", upsert: true });

      if (!uploadError) pdfPath = pdfFileName;
    } catch (pdfError) {
      console.error("Error regenerando PDF:", pdfError);
    }
  }

  const { error: updateError } = await supabase
    .from("informes")
    .update({ informe_paciente: informePaciente, pdf_path: pdfPath })
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

  const { data: informeData, error: fetchError } = await supabase
    .from("informes")
    .select("*, patients(*)")
    .eq("id", informeId)
    .eq("doctor_id", user.id)
    .single();

  if (fetchError || !informeData) return { error: "Informe no encontrado" };

  const { data: doctorData } = await supabase
    .from("doctors")
    .select("name, matricula, especialidad, firma_digital")
    .eq("id", user.id)
    .single();

  let pdfPath: string | null = informeData.pdf_path ?? null;

  if (informePaciente) {
    try {
      const patient = (informeData as { patients: { name: string; phone: string } }).patients;
      const pdfBytes = await generateInformePDF({
        patientName: patient.name,
        patientPhone: patient.phone,
        date: new Date(informeData.created_at).toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        content: informePaciente,
        doctor: doctorData
          ? {
              name: doctorData.name,
              matricula: doctorData.matricula,
              especialidad: doctorData.especialidad,
              firmaDigital: doctorData.firma_digital,
            }
          : null,
      });

      const pdfFileName = `${user.id}/${informeId}/informe-paciente.pdf`;
      const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const { error: uploadError } = await supabase.storage
        .from("informes-pdf")
        .upload(pdfFileName, pdfBlob, { contentType: "application/pdf", upsert: true });

      if (!uploadError) pdfPath = pdfFileName;
    } catch (pdfError) {
      console.error("Error regenerando PDF:", pdfError);
    }
  }

  const { error: updateError } = await supabase
    .from("informes")
    .update({ informe_doctor: informeDoctor, informe_paciente: informePaciente, pdf_path: pdfPath })
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

  const { data: informeData, error: fetchError } = await supabase
    .from("informes")
    .select("id, transcript")
    .eq("id", informeId)
    .eq("doctor_id", user.id)
    .single();

  if (fetchError || !informeData) return { error: "Informe no encontrado" };
  if (!informeData.transcript) return { error: "No hay transcripción disponible" };

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `Eres un asistente médico experto. El doctor ha editado los informes generados previamente. Basándote en la transcripción original y las ediciones del doctor, regenera ambos informes incorporando los cambios.

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

Mantén las ediciones del doctor como base, mejorando coherencia y formato.`,
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

  const { data: doctorDataConsent } = await supabase
    .from("doctors")
    .select("name, matricula, especialidad, firma_digital")
    .eq("id", user.id)
    .single();

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

  try {
    const patient = (informeData as { patients: { name: string; phone: string } }).patients;
    const pdfBytes = await generateInformePDF({
      patientName: patient.name,
      patientPhone: patient.phone,
      date: new Date(informeData.created_at).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      content: informeData.informe_paciente,
      doctor: doctorDataConsent
        ? {
            name: doctorDataConsent.name,
            matricula: doctorDataConsent.matricula,
            especialidad: doctorDataConsent.especialidad,
            firmaDigital: doctorDataConsent.firma_digital,
          }
        : null,
    });

    const pdfFileName = `${user.id}/${informeId}/informe-paciente.pdf`;
    const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    await supabase.storage
      .from("informes-pdf")
      .upload(pdfFileName, pdfBlob, { contentType: "application/pdf", upsert: true });

    await supabase
      .from("informes")
      .update({ pdf_path: pdfFileName })
      .eq("id", informeId)
      .eq("doctor_id", user.id);
  } catch (pdfError) {
    console.error("Error regenerando PDF con consentimiento:", pdfError);
  }

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
    .select("*, patients(*)")
    .eq("id", informeId)
    .eq("doctor_id", user.id)
    .single();

  if (fetchError || !informeData) return { error: "Informe no encontrado" };
  if (informeData.status !== "completed") return { error: "El informe no está completado" };

  const { data: doctorData } = await supabase
    .from("doctors")
    .select("name, matricula, especialidad, firma_digital")
    .eq("id", user.id)
    .single();

  try {
    const patient = (
      informeData as { patients: { name: string; phone: string; dni?: string | null; dob?: string | null } }
    ).patients;

    const date = new Date(informeData.created_at).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const patientDob = patient.dob
      ? new Date(patient.dob + "T00:00:00").toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : null;

    const certBytes = await generateCertificadoPDF({
      patientName: patient.name,
      patientDni: patient.dni ?? null,
      patientDob,
      date,
      diagnosis: options.diagnosis ?? null,
      daysOff: options.daysOff ?? null,
      observations: options.observations ?? null,
      doctor: doctorData
        ? {
            name: doctorData.name,
            matricula: doctorData.matricula,
            especialidad: doctorData.especialidad,
            firmaDigital: doctorData.firma_digital,
          }
        : null,
    });

    const certFileName = `${user.id}/${informeId}/certificado-medico.pdf`;
    const certBlob = new Blob([certBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const { error: uploadError } = await supabase.storage
      .from("informes-pdf")
      .upload(certFileName, certBlob, { contentType: "application/pdf", upsert: true });

    if (uploadError) return { error: uploadError.message };

    const { data: signed } = await supabase.storage
      .from("informes-pdf")
      .createSignedUrl(certFileName, 3600);

    return { signedUrl: signed?.signedUrl ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { error: message };
  }
}

export async function generateAndSavePdf(informeId: string) {
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

  const { data: doctorDataPdf } = await supabase
    .from("doctors")
    .select("name, matricula, especialidad, firma_digital")
    .eq("id", user.id)
    .single();

  try {
    const patient = (informeData as { patients: { name: string; phone: string } }).patients;
    const pdfBytes = await generateInformePDF({
      patientName: patient.name,
      patientPhone: patient.phone,
      date: new Date(informeData.created_at).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      content: informeData.informe_paciente,
      doctor: doctorDataPdf
        ? {
            name: doctorDataPdf.name,
            matricula: doctorDataPdf.matricula,
            especialidad: doctorDataPdf.especialidad,
            firmaDigital: doctorDataPdf.firma_digital,
          }
        : null,
    });

    const pdfFileName = `${user.id}/${informeId}/informe-paciente.pdf`;
    const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const { error: uploadError } = await supabase.storage
      .from("informes-pdf")
      .upload(pdfFileName, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) return { error: uploadError.message };

    await supabase
      .from("informes")
      .update({ pdf_path: pdfFileName })
      .eq("id", informeId)
      .eq("doctor_id", user.id);

    revalidatePath(`/informes/${informeId}`);

    const { data: signed } = await supabase.storage
      .from("informes-pdf")
      .createSignedUrl(pdfFileName, 3600);

    return { signedUrl: signed?.signedUrl ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { error: message };
  }
}
