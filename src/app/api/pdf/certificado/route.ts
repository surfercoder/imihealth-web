import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/utils/supabase/api-auth";
import { generateCertificadoPDF } from "@/lib/pdf";
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

    const params = request.nextUrl.searchParams;
    const informeId = params.get("id");
    if (!informeId) {
      return NextResponse.json({ error: "Missing informe id" }, { status: 400 });
    }

    const { data: informe } = await supabase
      .from("informes")
      .select("created_at, status, patients(name, phone, dni, dob)")
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
      dni: string | null;
      dob: string | null;
    } | null;

    const patientDob = patient?.dob
      ? new Date(patient.dob + "T00:00:00").toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : null;

    const daysOff = params.get("daysOff");
    const diagnosis = params.get("diagnosis");
    const observations = params.get("observations");

    const t = await getTranslations("pdfCertificado");

    const formattedDate = new Date(informe.created_at).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const sanitizedPatientName = sanitizeForPdf(patient?.name ?? "Paciente");
    const doctorNameBase = doctorData?.name
      ? sanitizeForPdf(doctorData.name)
      : t("signerFallback");
    let doctorNameWithCredentials = doctorNameBase;
    if (doctorData?.matricula) {
      doctorNameWithCredentials += t("bodyWithMatricula", {
        matricula: sanitizeForPdf(doctorData.matricula),
      });
    }
    if (doctorData?.especialidad) {
      doctorNameWithCredentials += t("bodyWithEspecialidad", {
        especialidad: sanitizeForPdf(doctorData.especialidad),
      });
    }
    const daysOffNum = daysOff ? parseInt(daysOff, 10) : null;
    const daysOffText =
      daysOffNum && daysOffNum > 0
        ? daysOffNum === 1
          ? t("daysOff1")
          : t("daysOffN", { days: String(daysOffNum) })
        : null;

    const certBytes = await generateCertificadoPDF({
      patientName: patient?.name ?? "Paciente",
      date: formattedDate,
      diagnosis: diagnosis || null,
      observations: observations || null,
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
        dniLine: patient?.dni ? t("dni", { dni: patient.dni }) : null,
        dobLine: patientDob ? t("dob", { dob: patientDob }) : null,
        bodyText: t("bodyText", {
          doctorName: doctorNameWithCredentials,
          patientName: sanitizedPatientName,
          date: formattedDate,
        }),
        daysOffText,
        diagnosis: t("diagnosis"),
        observations: t("observations"),
        footer: t("footer"),
      },
    });

    return new NextResponse(Buffer.from(certBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="certificado-medico.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating certificado:", error);
    return NextResponse.json({ error: "Failed to generate certificado" }, { status: 500 });
  }
}
