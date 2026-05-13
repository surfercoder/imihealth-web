import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/utils/supabase/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  uploadMediaToWhatsApp,
  sendWhatsAppTemplateWithDocument,
  sendWhatsAppTemplateWithImage,
} from "@/lib/whatsapp";
import {
  CertOptions,
  PatientRelation,
  formatEsArDate,
  formatPatientDob,
  getDocFilename,
  getDocTemplateName,
  getImgTemplateName,
  getLanguageCode,
  getPedidoDocTemplateName,
  getPngFilename,
  mapDoctorInfo,
} from "./helpers";
import { generateCertificadoMedia, generateInformeMedia, GeneratedMedia } from "./media";
import { generatePedidoPDF } from "@/lib/pdf/pedido";
import { sanitizeForPdf } from "@/lib/pdf/helpers";
import { extractDiagnosticoPresuntivo } from "@/app/api/pdf/pedido/utils";
import { getTranslations } from "next-intl/server";

// eslint-disable-next-line react-doctor/no-giant-component -- POST is a Next.js route handler, not a React component; the rule matches the uppercase name
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedSupabase(request);
    if (!supabase || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { allowed, retryAfter } = checkRateLimit(user.id, {
      key: "send-whatsapp",
      limit: 15,
      windowSeconds: 60,
    });
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    const body = await request.json();
    const { to, type, informeId, patientName, locale } = body;

    if (!to || !type) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: to, type" },
        { status: 400 }
      );
    }

    const isPedidosPatient = type === "pedidos-patient";
    const isPedidos = type === "pedidos";
    const isInforme = type === "informe";
    const langCode = getLanguageCode(locale);

    if (isPedidosPatient) {
      const { patientId, pedidoItems, diagnostico } = body as {
        patientId?: string;
        pedidoItems?: string[];
        diagnostico?: string | null;
      };

      if (!patientId) {
        return NextResponse.json(
          { success: false, error: "Missing patientId" },
          { status: 400 }
        );
      }

      if (!pedidoItems || pedidoItems.length === 0) {
        return NextResponse.json(
          { success: false, error: "No pedido items provided" },
          { status: 400 }
        );
      }

      const { data: patient } = await supabase
        .from("patients")
        .select("name, obra_social, nro_afiliado, plan")
        .eq("id", patientId)
        .eq("doctor_id", user.id)
        .single();

      if (!patient) {
        return NextResponse.json(
          { success: false, error: "Patient not found" },
          { status: 404 }
        );
      }

      const { data: doctorData } = await supabase
        .from("doctors")
        .select("name, matricula, especialidad, tagline, firma_digital")
        .eq("id", user.id)
        .single();

      const doctorInfo = mapDoctorInfo(doctorData);
      const tPedido = await getTranslations("pdfPedido");
      const dateStr = new Date().toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      const pedidoLabels = {
        subtitle: tPedido("subtitle"),
        patientData: tPedido("patientData"),
        obraSocial: tPedido("obraSocial"),
        nroAfiliado: tPedido("nroAfiliado"),
        nroAfiliadoInline: tPedido("nroAfiliadoInline"),
        plan: tPedido("plan"),
        solicito: tPedido("solicito"),
        diagnosis: tPedido("diagnosis"),
        footer: tPedido("footer"),
      };

      const pedidoTemplateName = getPedidoDocTemplateName(locale);
      const cleanDiagnostico = diagnostico && diagnostico.trim() ? diagnostico.trim() : null;

      // PDF gen + upload + template send for each item are independent across
      // items — race them with Promise.all instead of waterfalling.
      const results = await Promise.all(
        pedidoItems.map(async (item) => {
          const pdfBytes = await generatePedidoPDF({
            patientName: patient.name ?? patientName ?? "",
            obraSocial: patient.obra_social ?? null,
            nroAfiliado: patient.nro_afiliado ?? null,
            plan: patient.plan ?? null,
            date: dateStr,
            item,
            diagnostico: cleanDiagnostico,
            doctor: doctorInfo,
            labels: pedidoLabels,
          });
          const pdfUpload = await uploadMediaToWhatsApp(pdfBytes, "application/pdf", "pedido-medico.pdf");
          if (!pdfUpload.success) {
            console.error(`[WhatsApp] Patient pedido PDF upload failed for item: ${item}`, pdfUpload.error);
            return false;
          }
          const docResult = await sendWhatsAppTemplateWithDocument({
            to,
            templateName: pedidoTemplateName,
            languageCode: langCode,
            bodyParameters: [],
            mediaId: pdfUpload.mediaId,
            documentFilename: "pedido-medico.pdf",
          });
          if (!docResult.success) {
            console.error(`[WhatsApp] Patient pedido template failed for item: ${item}`, docResult.error);
            return false;
          }
          return true;
        }),
      );
      const sentCount = results.reduce((acc, ok) => acc + (ok ? 1 : 0), 0);

      if (sentCount === 0) {
        return NextResponse.json(
          { success: false, error: "Failed to send any pedidos" },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        sentCount,
        totalItems: pedidoItems.length,
      });
    }

    if (!informeId) {
      return NextResponse.json(
        { success: false, error: "Missing required field: informeId" },
        { status: 400 }
      );
    }

    const { data: informe } = await supabase
      .from("informes")
      .select("informe_paciente, informe_doctor, created_at, patients(name, phone, dob, dni, obra_social, nro_afiliado, plan)")
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
      .select("name, matricula, especialidad, tagline, firma_digital")
      .eq("id", user.id)
      .single();

    const patient = informe.patients as unknown as (PatientRelation & {
      obra_social?: string | null;
      nro_afiliado?: string | null;
      plan?: string | null;
    }) | null;
    const dateStr = formatEsArDate(informe.created_at);
    const doctorInfo = mapDoctorInfo(doctorData);

    const [tInforme, tCert, tPedido] = await Promise.all([
      getTranslations("pdfInforme"),
      getTranslations("pdfCertificado"),
      getTranslations("pdfPedido"),
    ]);

    const sanitizedPatientName = sanitizeForPdf(patient?.name ?? patientName ?? "");
    const patientDob = formatPatientDob(patient?.dob);

    const informeLabels = {
      subtitle: tInforme("subtitle"),
      patient: tInforme("patient"),
      phoneLine: tInforme("phone", { phone: sanitizeForPdf(patient?.phone ?? "") }),
      consentTitle: tInforme("consentTitle"),
      consentLine1: tInforme("consentLine1", { patientName: sanitizedPatientName }),
      consentLine2: tInforme("consentLine2"),
      consentDate: tInforme("consentDate", { date: dateStr }),
      footerGenerated: tInforme("footerGenerated"),
      footerAdvice: tInforme("footerAdvice"),
    };

    const buildCertLabels = (certOpts: CertOptions | undefined) => {
      const doctorNameBase = doctorInfo?.name
        ? sanitizeForPdf(doctorInfo.name)
        : tCert("signerFallback");
      let doctorNameWithCredentials = doctorNameBase;
      if (doctorInfo?.matricula) {
        doctorNameWithCredentials += tCert("bodyWithMatricula", {
          matricula: sanitizeForPdf(doctorInfo.matricula),
        });
      }
      if (doctorInfo?.especialidad) {
        doctorNameWithCredentials += tCert("bodyWithEspecialidad", {
          especialidad: sanitizeForPdf(doctorInfo.especialidad),
        });
      }
      const daysOff = certOpts?.daysOff ?? null;
      const daysOffText =
        daysOff && daysOff > 0
          ? daysOff === 1
            ? tCert("daysOff1")
            : tCert("daysOffN", { days: String(daysOff) })
          : null;
      return {
        subtitle: tCert("subtitle"),
        patientData: tCert("patientData"),
        dniLine: patient?.dni ? tCert("dni", { dni: patient.dni }) : null,
        dobLine: patientDob ? tCert("dob", { dob: patientDob }) : null,
        bodyText: tCert("bodyText", {
          doctorName: doctorNameWithCredentials,
          patientName: sanitizedPatientName,
          date: dateStr,
        }),
        daysOffText,
        diagnosis: tCert("diagnosis"),
        observations: tCert("observations"),
        footer: tCert("footer"),
      };
    };

    const pedidoLabels = {
      subtitle: tPedido("subtitle"),
      patientData: tPedido("patientData"),
      obraSocial: tPedido("obraSocial"),
      nroAfiliado: tPedido("nroAfiliado"),
      nroAfiliadoInline: tPedido("nroAfiliadoInline"),
      plan: tPedido("plan"),
      solicito: tPedido("solicito"),
      diagnosis: tPedido("diagnosis"),
      footer: tPedido("footer"),
    };

    // Handle pedidos: generate and send one PDF per item
    if (isPedidos) {
      const { pedidoItems } = body as { pedidoItems?: string[] };
      if (!pedidoItems || pedidoItems.length === 0) {
        return NextResponse.json(
          { success: false, error: "No pedido items provided" },
          { status: 400 }
        );
      }

      const pedidoTemplateName = getPedidoDocTemplateName(locale);

      const diagnostico = extractDiagnosticoPresuntivo(
        informe.informe_doctor as string | null
      );

      // PDF gen + upload + template send for each item are independent across
      // items — race them with Promise.all instead of waterfalling.
      const results = await Promise.all(
        pedidoItems.map(async (item) => {
          const pdfBytes = await generatePedidoPDF({
            patientName: patient?.name ?? patientName ?? "",
            obraSocial: patient?.obra_social ?? null,
            nroAfiliado: patient?.nro_afiliado ?? null,
            plan: patient?.plan ?? null,
            date: dateStr,
            item,
            diagnostico,
            doctor: doctorInfo,
            labels: pedidoLabels,
          });
          const pdfUpload = await uploadMediaToWhatsApp(pdfBytes, "application/pdf", "pedido-medico.pdf");
          if (!pdfUpload.success) {
            console.error(`[WhatsApp] Pedido PDF upload failed for item: ${item}`, pdfUpload.error);
            return false;
          }
          const docResult = await sendWhatsAppTemplateWithDocument({
            to,
            templateName: pedidoTemplateName,
            languageCode: langCode,
            bodyParameters: [],
            mediaId: pdfUpload.mediaId,
            documentFilename: "pedido-medico.pdf",
          });
          if (!docResult.success) {
            console.error(`[WhatsApp] Pedido template failed for item: ${item}`, docResult.error);
            return false;
          }
          return true;
        }),
      );
      const sentCount = results.reduce((acc, ok) => acc + (ok ? 1 : 0), 0);

      if (sentCount === 0) {
        return NextResponse.json(
          { success: false, error: "Failed to send any pedidos" },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        sentCount,
        totalItems: pedidoItems.length,
      });
    }

    // Handle informe and certificado
    const docTemplateName = getDocTemplateName(isInforme, locale);
    const imgTemplateName = getImgTemplateName(isInforme, locale);

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
        labels: informeLabels,
      });
    } else {
      const { certOptions } = body as { certOptions?: CertOptions };
      media = await generateCertificadoMedia({
        patient,
        patientNameFallback: patientName,
        dateStr,
        doctorInfo,
        certOptions,
        labels: buildCertLabels(certOptions),
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
