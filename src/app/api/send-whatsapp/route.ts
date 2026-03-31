import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  uploadMediaToWhatsApp,
  sendWhatsAppTemplateWithDocument,
  sendWhatsAppTemplateWithImage,
} from "@/lib/whatsapp";
import { generateInformePDF, generateCertificadoPDF } from "@/lib/pdf";
import { generateInformeImage, generateCertificadoImage } from "@/lib/report-image";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { to, type, informeId, patientName, locale } = body;

    if (!to || !informeId || !type) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: to, informeId, type" },
        { status: 400 }
      );
    }

    const isInforme = type === "informe";
    const langCode = locale === "es" ? "es_AR" : "en";

    const docTemplateName = isInforme
      ? locale === "es" ? "informe_con_documento_es" : "informe_con_documento_en"
      : locale === "es" ? "certificado_con_documento_es" : "certificado_con_documento_en";

    const imgTemplateName = isInforme
      ? locale === "es" ? "informe_imagen_es" : "informe_imagen_en"
      : locale === "es" ? "certificado_imagen_es" : "certificado_imagen_en";

    // Fetch informe + patient + doctor data from DB
    const { data: informe } = await supabase
      .from("informes")
      .select("informe_paciente, created_at, patients(name, phone, dob, dni)")
      .eq("id", informeId)
      .eq("doctor_id", user.id)
      .single();

    if (!informe) {
      return NextResponse.json(
        { success: false, error: "Informe not found" },
        { status: 404 }
      );
    }

    const { data: doctorData } = await supabase
      .from("doctors")
      .select("name, matricula, especialidad, firma_digital")
      .eq("id", user.id)
      .single();

    const patient = informe.patients as unknown as {
      name: string;
      phone: string;
      dob: string | null;
      dni: string | null;
    } | null;

    const dateStr = new Date(informe.created_at).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const doctorInfo = doctorData
      ? {
          name: doctorData.name,
          matricula: doctorData.matricula,
          especialidad: doctorData.especialidad,
          firmaDigital: doctorData.firma_digital,
        }
      : null;

    let pdfBytes: Uint8Array;
    let pngBuffer: Buffer;

    if (isInforme) {
      // ─── Generate informe PDF + PNG from DB data ───
      if (!informe.informe_paciente) {
        return NextResponse.json(
          { success: false, error: "Informe content not found" },
          { status: 404 }
        );
      }

      pdfBytes = await generateInformePDF({
        patientName: patient?.name ?? patientName,
        patientPhone: patient?.phone ?? null,
        date: dateStr,
        content: informe.informe_paciente,
        doctor: doctorInfo,
      });

      pngBuffer = await generateInformeImage({
        patientName: patient?.name ?? patientName,
        patientPhone: patient?.phone ?? null,
        date: dateStr,
        content: informe.informe_paciente,
        doctor: doctorInfo,
      });
    } else {
      // ─── Generate certificado PDF + PNG from DB data + client options ───
      const { certOptions } = body as {
        certOptions?: {
          daysOff?: number | null;
          diagnosis?: string | null;
          observations?: string | null;
        };
      };

      const patientDob = patient?.dob
        ? new Date(patient.dob + "T00:00:00").toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })
        : null;

      pdfBytes = await generateCertificadoPDF({
        patientName: patient?.name ?? patientName,
        patientDni: patient?.dni ?? null,
        patientDob,
        date: dateStr,
        diagnosis: certOptions?.diagnosis ?? null,
        daysOff: certOptions?.daysOff ?? null,
        observations: certOptions?.observations ?? null,
        doctor: doctorInfo,
      });

      pngBuffer = await generateCertificadoImage({
        patientName: patient?.name ?? patientName,
        patientDob,
        date: dateStr,
        diagnosis: certOptions?.diagnosis ?? null,
        daysOff: certOptions?.daysOff ?? null,
        observations: certOptions?.observations ?? null,
        doctor: doctorInfo,
      });
    }

    // ─── Upload PDF to Meta ───
    const docFilename = isInforme ? "informe-medico.pdf" : "certificado-medico.pdf";
    const pdfUpload = await uploadMediaToWhatsApp(pdfBytes, "application/pdf", docFilename);

    if (!pdfUpload.success) {
      return NextResponse.json(
        { success: false, error: `PDF upload failed: ${pdfUpload.error}` },
        { status: 502 }
      );
    }

    // ─── Upload PNG to Meta ───
    const pngFilename = isInforme ? "informe-medico.png" : "certificado-medico.png";
    const pngUpload = await uploadMediaToWhatsApp(pngBuffer, "image/png", pngFilename);

    if (!pngUpload.success) {
      console.error("[WhatsApp] PNG upload failed:", pngUpload.error);
    }

    // ─── Send template with DOCUMENT header ───
    const docResult = await sendWhatsAppTemplateWithDocument({
      to,
      templateName: docTemplateName,
      languageCode: langCode,
      bodyParameters: [patientName],
      mediaId: pdfUpload.mediaId,
      documentFilename: docFilename,
    });

    if (!docResult.success) {
      return NextResponse.json(
        { success: false, error: docResult.error },
        { status: 502 }
      );
    }

    // ─── Send template with IMAGE header ───
    let imageSent = false;
    if (pngUpload.success) {
      const imgResult = await sendWhatsAppTemplateWithImage({
        to,
        templateName: imgTemplateName,
        languageCode: langCode,
        bodyParameters: [patientName],
        mediaId: pngUpload.mediaId,
      });

      if (!imgResult.success) {
        console.error("[WhatsApp] Image template failed:", imgResult.error);
      } else {
        imageSent = true;
      }
    }

    return NextResponse.json({
      success: true,
      messageId: docResult.messageId,
      imageSent,
    });
  } catch (error) {
    console.error("Error in send-whatsapp API:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send WhatsApp message" },
      { status: 500 }
    );
  }
}
