import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getTranslations, getLocale } from "next-intl/server";
import {
  ArrowLeft,
  User,
  Phone,
  Calendar,
  FileText,
  Download,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { regeneratePdf } from "@/actions/informes";
import { generateInformePDF } from "@/lib/pdf";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { CertificadoButton } from "@/components/certificado-button";
import { TranscriptDialog, type DialogTurn } from "@/components/transcript-dialog";
import { ConsentSection } from "@/components/consent-section";
import { InformeEditor } from "@/components/informe-editor";

interface Props {
  params: Promise<{ id: string }>;
}

const statusVariants: Record<string, "secondary" | "default" | "destructive"> = {
  recording: "secondary",
  processing: "secondary",
  completed: "default",
  error: "destructive",
};

const statusIcons = {
  recording: Clock,
  processing: Loader2,
  completed: FileText,
  error: AlertCircle,
};

export const metadata: Metadata = {
  title: "Informe | IMI",
  description: "Detalle del informe médico",
};

function PatientCard({ patient, dobFormatted, patientAge, yearsOldLabel }: {
  patient: { name: string; phone: string; email: string | null };
  dobFormatted: string | null;
  patientAge: number | null;
  yearsOldLabel: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base text-card-foreground">{patient.name}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Phone className="size-3.5" />
              {patient.phone}
            </span>
            {dobFormatted && (
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {dobFormatted}{patientAge !== null && ` (${patientAge} ${yearsOldLabel})`}
              </span>
            )}
            {patient.email && <span className="flex items-center gap-1.5">{patient.email}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function InformeActions({ pdfSignedUrl, whatsappPhone, patientName, informeId }: {
  pdfSignedUrl: string | null;
  whatsappPhone: string;
  patientName: string;
  informeId: string;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {pdfSignedUrl ? (
        <>
          <Button variant="outline" size="sm" asChild>
            <a href={pdfSignedUrl} target="_blank" rel="noopener noreferrer">
              <Download className="size-4 mr-1.5" />
              PDF
            </a>
          </Button>
          <WhatsAppButton
            phone={whatsappPhone}
            patientName={patientName}
            pdfUrl={pdfSignedUrl}
          />
        </>
      ) : (
        <form action={regeneratePdf.bind(null, informeId)}>
          <Button variant="outline" size="sm" type="submit">
            <Download className="size-4 mr-1.5" />
            Generar PDF
          </Button>
        </form>
      )}
      <CertificadoButton informeId={informeId} patientName={patientName} />
    </div>
  );
}

export default async function InformePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [t, { data: doctor }] = await Promise.all([
    getTranslations(),
    supabase.from("doctors").select("name").eq("id", user.id).single(),
  ]);
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "es-AR";

  const { data: informe, error } = await supabase
    .from("informes")
    .select("*, patients(id, name, phone, dob, email)")
    .eq("id", id)
    .eq("doctor_id", user.id)
    .single();

  if (error || !informe) notFound();

  if (informe.status === "recording") {
    redirect(`/informes/${id}/grabar`);
  }

  const patient = informe.patients as {
    id: string;
    name: string;
    phone: string;
    dob: string | null;
    email: string | null;
  };

  const dobFormatted = patient.dob
    ? new Date(patient.dob + "T00:00:00").toLocaleDateString(dateLocale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  const patientAge = patient.dob
    ? (() => {
        const today = new Date();
        const birth = new Date(patient.dob + "T00:00:00");
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
      })()
    : null;

  const createdAt = new Date(informe.created_at).toLocaleDateString(dateLocale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusKey = informe.status as keyof typeof statusIcons;
  const StatusIcon = statusIcons[statusKey] ?? AlertCircle;
  const statusVariant = statusVariants[informe.status] ?? "destructive";
  const statusLabel = t(`status.${statusKey}` as Parameters<typeof t>[0]);

  let pdfSignedUrl: string | null = null;
  if (informe.status === "completed" && informe.informe_paciente) {
    try {
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("name, matricula, especialidad, firma_digital")
        .eq("id", user.id)
        .single();

      const pdfBytes = await generateInformePDF({
        patientName: patient.name,
        patientPhone: patient.phone,
        date: new Date(informe.created_at).toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        content: informe.informe_paciente,
        consentAt: informe.patient_consent_at
          ? new Date(informe.patient_consent_at).toLocaleString("es-AR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : null,
        doctor: doctorData
          ? {
              name: doctorData.name,
              matricula: doctorData.matricula,
              especialidad: doctorData.especialidad,
              firmaDigital: doctorData.firma_digital,
            }
          : null,
      });

      const pdfFileName = `${user.id}/${id}/informe-paciente.pdf`;
      const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const admin = createAdminClient();
      const { error: uploadError } = await admin.storage
        .from("informes-pdf")
        .upload(pdfFileName, pdfBlob, { contentType: "application/pdf", upsert: true });

      if (!uploadError) {
        await admin
          .from("informes")
          .update({ pdf_path: pdfFileName })
          .eq("id", id)
          .eq("doctor_id", user.id);

        const { data: signed } = await admin.storage
          .from("informes-pdf")
          .createSignedUrl(pdfFileName, 3600);
        pdfSignedUrl = signed?.signedUrl ?? null;
      }
    } catch (pdfErr) {
      console.error("PDF generation error:", pdfErr);
    }
  }

  const whatsappPhone = patient.phone.replace(/\D/g, "");

  return (
    <div className="flex min-h-screen flex-col bg-background pt-14">
      <AppHeader doctorName={doctor?.name} />

      <div className="border-b border-border/40">
        <div className="mx-auto flex h-11 max-w-5xl items-center gap-3 px-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/patients/${patient.id}`}>
              <ArrowLeft className="size-4 mr-1.5" />
              {patient.name}
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <span className="text-sm text-foreground/60 truncate">{t("nav.report")}</span>
          <Badge variant={statusVariant} className="ml-auto flex items-center gap-1.5 text-xs">
            <StatusIcon className="size-3" />
            {statusLabel}
          </Badge>
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("informePage.title")}
            </h1>
            <p className="mt-1 text-sm text-foreground/60 flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {createdAt}
            </p>
          </div>

          {informe.status === "completed" && (
            <InformeActions
              pdfSignedUrl={pdfSignedUrl}
              whatsappPhone={whatsappPhone}
              patientName={patient.name}
              informeId={id}
            />
          )}
        </div>

        <PatientCard
          patient={patient}
          dobFormatted={dobFormatted}
          patientAge={patientAge}
          yearsOldLabel={t("informePage.yearsOld")}
        />

        {informe.status === "processing" && (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-16 text-center shadow-sm">
            <Loader2 className="size-10 text-primary animate-spin mb-4" />
            <p className="font-medium text-card-foreground">{t("informePage.processing")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("informePage.processingHint")}
            </p>
          </div>
        )}

        {informe.status === "error" && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 p-16 text-center">
            <AlertCircle className="size-10 text-destructive mb-4" />
            <p className="font-medium text-destructive">{t("informePage.errorProcessing")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("informePage.errorHint")}
            </p>
          </div>
        )}

        {informe.status === "completed" && (
          <InformeEditor
            informeId={id}
            informeDoctor={informe.informe_doctor || ""}
            informePaciente={informe.informe_paciente || ""}
            hasTranscript={!!informe.transcript}
            patientConsent={informe.patient_consent ?? false}
            patientConsentAt={
              informe.patient_consent_at
                ? new Date(informe.patient_consent_at).toLocaleString(dateLocale, {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null
            }
            patientName={patient.name}
          />
        )}

        {informe.transcript && (
          <details className="rounded-xl border bg-card shadow-sm overflow-hidden group">
            <summary className="flex cursor-pointer items-center gap-2 px-5 py-4 text-sm font-medium text-card-foreground hover:bg-muted transition-colors select-none">
              <FileText className="size-4 text-muted-foreground" />
              {t("informePage.transcript")}
              <span className="ml-auto text-xs text-muted-foreground">
                {informe.transcript_dialog
                  ? t("informePage.interventions", { count: (informe.transcript_dialog as DialogTurn[]).length })
                  : t("informePage.transcriptFull")}
              </span>
            </summary>
            <div className="border-t px-5 py-6">
              {informe.transcript_dialog ? (
                <TranscriptDialog
                  dialog={informe.transcript_dialog as DialogTurn[]}
                  patientName={patient.name}
                />
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-card-foreground">
                  {informe.transcript}
                </p>
              )}
            </div>
          </details>
        )}

        {informe.status === "completed" && informe.informe_paciente && (
          <ConsentSection
            informeId={id}
            dialog={(informe.transcript_dialog as DialogTurn[]) ?? []}
            patientName={patient.name}
            informePaciente={informe.informe_paciente}
            initialConsent={informe.patient_consent ?? false}
            initialConsentAt={
              informe.patient_consent_at
                ? new Date(informe.patient_consent_at).toLocaleString(dateLocale, {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null
            }
          />
        )}
      </main>
    </div>
  );
}
