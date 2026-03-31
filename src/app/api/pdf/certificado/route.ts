import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generateCertificadoPDF } from "@/lib/pdf";

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
      .select("name, matricula, especialidad, firma_digital")
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

    const certBytes = await generateCertificadoPDF({
      patientName: patient?.name ?? "Paciente",
      patientDni: patient?.dni ?? null,
      patientDob,
      date: new Date(informe.created_at).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      diagnosis: diagnosis || null,
      daysOff: daysOff ? parseInt(daysOff, 10) : null,
      observations: observations || null,
      doctor: doctorData
        ? {
            name: doctorData.name,
            matricula: doctorData.matricula,
            especialidad: doctorData.especialidad,
            firmaDigital: doctorData.firma_digital,
          }
        : null,
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
