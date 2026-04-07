import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  uploadMediaToWhatsApp,
  sendWhatsAppTemplateWithDocument,
  sendWhatsAppTemplateWithImage,
} from "@/lib/whatsapp";
import {
  CertOptions,
  PatientRelation,
  formatEsArDate,
  getDocFilename,
  getDocTemplateName,
  getImgTemplateName,
  getLanguageCode,
  getPngFilename,
  mapDoctorInfo,
} from "./helpers";
import { generateCertificadoMedia, generateInformeMedia, GeneratedMedia } from "./media";

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
    const langCode = getLanguageCode(locale);
    const docTemplateName = getDocTemplateName(isInforme, locale);
    const imgTemplateName = getImgTemplateName(isInforme, locale);

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

    const patient = informe.patients as unknown as PatientRelation | null;
    const dateStr = formatEsArDate(informe.created_at);
    const doctorInfo = mapDoctorInfo(doctorData);

    let media: GeneratedMedia;

    if (isInforme) {
      if (!informe.informe_paciente) {
        return NextResponse.json(
          { success: false, error: "Informe content not found" },
          { status: 404 }
        );
      }

      media = await generateInformeMedia({
        patient,
        patientNameFallback: patientName,
        dateStr,
        content: informe.informe_paciente,
        doctorInfo,
      });
    } else {
      const { certOptions } = body as { certOptions?: CertOptions };
      media = await generateCertificadoMedia({
        patient,
        patientNameFallback: patientName,
        dateStr,
        doctorInfo,
        certOptions,
      });
    }

    const docFilename = getDocFilename(isInforme);
    const pdfUpload = await uploadMediaToWhatsApp(media.pdfBytes, "application/pdf", docFilename);

    if (!pdfUpload.success) {
      return NextResponse.json(
        { success: false, error: `PDF upload failed: ${pdfUpload.error}` },
        { status: 502 }
      );
    }

    const pngFilename = getPngFilename(isInforme);
    const pngUpload = await uploadMediaToWhatsApp(media.pngBuffer, "image/png", pngFilename);

    if (!pngUpload.success) {
      console.error("[WhatsApp] PNG upload failed:", pngUpload.error);
    }

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
