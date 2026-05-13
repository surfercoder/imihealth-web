import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/utils/supabase/api-auth";
import { generateInformePDF } from "@/lib/pdf";
import { sanitizeForPdf } from "@/lib/pdf/helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTranslations } from "next-intl/server";

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedSupabase(request);
    if (!supabase || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed, retryAfter } = checkRateLimit(user.id, {
      key: "pdf-generation",
      limit: 30,
      windowSeconds: 60,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    const informeId = request.nextUrl.searchParams.get("id");
    if (!informeId) {
      return NextResponse.json({ error: "Missing informe id" }, { status: 400 });
    }

    const { data: informe } = await supabase
      .from("informes")
      .select("informe_paciente, created_at, patients(name, phone)")
      .eq("id", informeId)
      .eq("doctor_id", user.id)
      .single();

    if (!informe?.informe_paciente) {
      return NextResponse.json({ error: "Informe not found" }, { status: 404 });
    }

    const { data: doctorData } = await supabase
      .from("doctors")
      .select("name, matricula, especialidad, tagline, firma_digital")
      .eq("id", user.id)
      .single();

    const patient = informe.patients as unknown as {
      name: string;
      phone: string;
    } | null;

    const t = await getTranslations("pdfInforme");

    const formattedDate = new Date(informe.created_at).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const sanitizedPatientName = sanitizeForPdf(patient?.name ?? "Paciente");

    const pdfBytes = await generateInformePDF({
      patientName: patient?.name ?? "Paciente",
      date: formattedDate,
      content: informe.informe_paciente,
      doctor: doctorData
        ? {
            name: doctorData.name,
            matricula: doctorData.matricula,
            especialidad: doctorData.especialidad,
            tagline: doctorData.tagline,
            firmaDigital: doctorData.firma_digital,
          }
        : null,
      labels: {
        subtitle: t("subtitle"),
        patient: t("patient"),
        phoneLine: t("phone", { phone: sanitizeForPdf(patient?.phone ?? "") }),
        consentTitle: t("consentTitle"),
        consentLine1: t("consentLine1", { patientName: sanitizedPatientName }),
        consentLine2: t("consentLine2"),
        consentDate: t("consentDate", { date: formattedDate }),
        footerGenerated: t("footerGenerated"),
        footerAdvice: t("footerAdvice"),
      },
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="informe-paciente.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
