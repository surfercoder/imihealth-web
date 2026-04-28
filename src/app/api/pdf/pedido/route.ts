import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generatePedidoPDF } from "@/lib/pdf/pedido";
import { checkRateLimit } from "@/lib/rate-limit";
import { extractDiagnosticoPresuntivo } from "./utils";
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

    const params = request.nextUrl.searchParams;
    const informeId = params.get("id");
    const item = params.get("item");

    if (!informeId || !item) {
      return NextResponse.json({ error: "Missing informe id or item" }, { status: 400 });
    }

    const { data: informe } = await supabase
      .from("informes")
      .select("created_at, status, informe_doctor, patients(name, phone, obra_social, nro_afiliado, plan)")
      .eq("id", informeId)
      .eq("doctor_id", user.id)
      .single();

    if (!informe || informe.status !== "completed") {
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
      obra_social: string | null;
      nro_afiliado: string | null;
      plan: string | null;
    } | null;

    const diagnostico = extractDiagnosticoPresuntivo(
      informe.informe_doctor as string | null
    );

    const t = await getTranslations("pdfPedido");

    const pdfBytes = await generatePedidoPDF({
      patientName: patient?.name ?? "Paciente",
      obraSocial: patient?.obra_social ?? null,
      nroAfiliado: patient?.nro_afiliado ?? null,
      plan: patient?.plan ?? null,
      date: new Date(informe.created_at).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      item,
      diagnostico,
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
        patientData: t("patientData"),
        obraSocial: t("obraSocial"),
        nroAfiliado: t("nroAfiliado"),
        nroAfiliadoInline: t("nroAfiliadoInline"),
        plan: t("plan"),
        solicito: t("solicito"),
        diagnosis: t("diagnosis"),
        footer: t("footer"),
      },
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="pedido-medico.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating pedido:", error);
    return NextResponse.json({ error: "Failed to generate pedido" }, { status: 500 });
  }
}
