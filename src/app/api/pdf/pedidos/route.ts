import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@/utils/supabase/server";
import { generatePedidoPDF } from "@/lib/pdf/pedido";
import { checkRateLimit } from "@/lib/rate-limit";
import { extractDiagnosticoPresuntivo } from "@/app/api/pdf/pedido/utils";
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
    const items = params.getAll("item");

    if (!informeId || items.length === 0) {
      return NextResponse.json({ error: "Missing informe id or items" }, { status: 400 });
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
      .select("name, matricula, especialidad, firma_digital")
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

    const date = new Date(informe.created_at).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const doctor = doctorData
      ? {
          name: doctorData.name,
          matricula: doctorData.matricula,
          especialidad: doctorData.especialidad,
          firmaDigital: doctorData.firma_digital,
        }
      : null;

    const t = await getTranslations("pdfPedido");
    const pdfLabels = {
      subtitle: t("subtitle"),
      patientData: t("patientData"),
      obraSocial: t("obraSocial"),
      nroAfiliado: t("nroAfiliado"),
      nroAfiliadoInline: t("nroAfiliadoInline"),
      plan: t("plan"),
      solicito: t("solicito"),
      diagnosis: t("diagnosis"),
      footer: t("footer"),
    };

    const merged = await PDFDocument.create();

    for (const item of items) {
      const pdfBytes = await generatePedidoPDF({
        patientName: patient?.name ?? "Paciente",
        obraSocial: patient?.obra_social ?? null,
        nroAfiliado: patient?.nro_afiliado ?? null,
        plan: patient?.plan ?? null,
        date,
        item,
        diagnostico,
        doctor,
        labels: pdfLabels,
      });
      const doc = await PDFDocument.load(pdfBytes);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      for (const page of pages) {
        merged.addPage(page);
      }
    }

    const mergedBytes = await merged.save();

    return new NextResponse(Buffer.from(mergedBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="pedidos-medicos.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating pedidos:", error);
    return NextResponse.json({ error: "Failed to generate pedidos" }, { status: 500 });
  }
}
