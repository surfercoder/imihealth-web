"use server";

import { createClient } from "@/utils/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { generateInformePDF, generateCertificadoPDF } from "@/lib/pdf";
import { revalidatePath } from "next/cache";

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
  const dob = formData.get("dob") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;

  const { data, error } = await supabase
    .from("patients")
    .insert({
      doctor_id: user.id,
      name: name.trim(),
      dob: dob || null,
      phone: phone.trim(),
      email: email?.trim() || null,
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
  transcript: string,
  audioPath?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  await supabase
    .from("informes")
    .update({ status: "processing", audio_path: audioPath ?? null, transcript })
    .eq("id", informeId)
    .eq("doctor_id", user.id);

  try {
    const reportsResponse = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `Eres un asistente médico experto. Basándote en la siguiente transcripción de una consulta médica, genera DOS informes separados Y un diálogo estructurado.

TRANSCRIPCIÓN:
${transcript}

---

Genera la respuesta en el siguiente formato JSON exacto (sin markdown, solo JSON puro):
{
  "informe_doctor": "...",
  "informe_paciente": "...",
  "dialog": [
    { "speaker": "doctor", "text": "..." },
    { "speaker": "paciente", "text": "..." }
  ]
}

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
- Divide la transcripción en turnos de habla individuales
- Infiere quién habla basándote en el contexto: el doctor hace preguntas médicas, da diagnósticos y prescripciones; el paciente describe síntomas y responde preguntas
- Cada elemento del array tiene "speaker" ("doctor" o "paciente") y "text" (lo que dijo)
- Mantén el texto original sin modificaciones, solo segméntalo por turnos
- Si no puedes determinar el hablante con certeza, asigna "doctor" o "paciente" según el contexto más probable`,
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

    const jsonMatch = reportsText.match(/\{[\s\S]*\}/);
    try {
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : reportsText);
      informeDoctor = parsed.informe_doctor || "";
      informePaciente = parsed.informe_paciente || "";
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
      } catch (pdfError) {
        console.error("Error generando PDF:", pdfError);
      }
    }

    const { error: updateError } = await supabase
      .from("informes")
      .update({
        status: "completed",
        informe_doctor: informeDoctor,
        informe_paciente: informePaciente,
        pdf_path: pdfPath,
        transcript_dialog: transcriptDialog,
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
  informeDoctorEdited: string,
  informePacienteEdited: string
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
  if (!informeData.transcript) return { error: "No hay transcripción disponible" };

  try {
    const reportsResponse = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `Eres un asistente médico experto. Basándote en la siguiente transcripción de una consulta médica y en las correcciones/adiciones que el doctor ya realizó manualmente sobre los informes, genera versiones mejoradas y completas de ambos informes incorporando esas correcciones.

TRANSCRIPCIÓN ORIGINAL:
${informeData.transcript}

---

INFORME MÉDICO (borrador con correcciones del doctor):
${informeDoctorEdited}

---

INFORME PARA EL PACIENTE (borrador con correcciones del doctor):
${informePacienteEdited}

---

Genera la respuesta en el siguiente formato JSON exacto (sin markdown, solo JSON puro):
{
  "informe_doctor": "...",
  "informe_paciente": "..."
}

INSTRUCCIONES:
- Mantén TODAS las correcciones, adiciones y modificaciones que el doctor realizó en los borradores
- Completa o mejora cualquier sección que falte o esté incompleta, usando la transcripción como fuente
- El informe_doctor debe ser detallado y técnico con terminología médica apropiada
- El informe_paciente debe ser en lenguaje simple, amigable y sin jerga médica compleja
- Formato estructurado con secciones claras usando saltos de línea`,
        },
      ],
    });

    const reportsText =
      reportsResponse.content[0].type === "text" ? reportsResponse.content[0].text : "{}";

    let newInformeDoctor = informeDoctorEdited;
    let newInformePaciente = informePacienteEdited;

    const jsonMatch = reportsText.match(/\{[\s\S]*\}/);
    try {
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : reportsText);
      if (parsed.informe_doctor) newInformeDoctor = parsed.informe_doctor;
      if (parsed.informe_paciente) newInformePaciente = parsed.informe_paciente;
    } catch {
      // fall back to edited versions
    }

    const result = await updateInformeReports(informeId, newInformeDoctor, newInformePaciente);
    return result;
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
      consentAt,
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
      informeData as { patients: { name: string; phone: string; dob?: string | null } }
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
