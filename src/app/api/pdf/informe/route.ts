import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generateInformePDF } from "@/lib/pdf";
import { getTranslations } from "next-intl/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      .select("name, matricula, especialidad, firma_digital")
      .eq("id", user.id)
      .single();

    const patient = informe.patients as unknown as {
      name: string;
      phone: string;
    } | null;

    const t = await getTranslations("pdfInforme");

    const pdfBytes = await generateInformePDF({
      patientName: patient?.name ?? "Paciente",
      patientPhone: patient?.phone ?? null,
      date: new Date(informe.created_at).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      content: informe.informe_paciente,
      doctor: doctorData
        ? {
            name: doctorData.name,
            matricula: doctorData.matricula,
            especialidad: doctorData.especialidad,
            firmaDigital: doctorData.firma_digital,
          }
        : null,
      labels: {
        subtitle: t("subtitle"),
        patient: t("patient"),
        phone: t("phone"),
        consentTitle: t("consentTitle"),
        consentLine1: t("consentLine1"),
        consentLine2: t("consentLine2"),
        consentDate: t("consentDate"),
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
