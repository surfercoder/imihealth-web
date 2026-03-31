import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
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
  Clock,
  AlertCircle,
  Loader2,
  Mail,
  Home,
} from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { TranscriptDialog, type DialogTurn } from "@/components/transcript-dialog";
import { TranscriptMonologue } from "@/components/transcript-monologue";
import { InformeEditor } from "@/components/informe-editor";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
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
  title: "Informe | IMI Health",
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
            {patient.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5" />
                {patient.email}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


export default async function InformePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [t, { data: doctor }] = await Promise.all([
    getTranslations(),
    supabase.from("doctors").select("name, email, phone").eq("id", user.id).single(),
  ]);
  const locale = await getLocale();
  /* v8 ignore next */
  const dateLocale = locale === "en" ? "en-US" : "es-AR";

  const { data: informe, error } = await supabase
    .from("informes")
    .select("*, patients(id, name, phone, dob, email, whatsapp_opted_in)")
    .eq("id", id)
    .eq("doctor_id", user.id)
    .single();

  if (error || !informe) notFound();

  if (informe.status === "recording") {
    redirect(`/informes/${id}/grabar`);
  }

  const isQuickReport = !informe.patient_id;

  const patient = informe.patients as {
    id: string;
    name: string;
    phone: string;
    dob: string | null;
    email: string | null;
    whatsapp_opted_in: boolean;
  } | null;

  const dobFormatted = patient?.dob
    ? new Date(patient.dob + "T00:00:00").toLocaleDateString(dateLocale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  const patientAge = patient?.dob
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

  // Generate PDF URL on-demand via API route (no storage)
  const pdfUrl = (informe.status === "completed" && informe.informe_paciente && patient)
    ? `/api/pdf/informe?id=${id}`
    : null;

  const whatsappPhone = patient?.phone ? patient.phone.replace(/\D/g, "") : undefined;
  /* v8 ignore next */
  const doctorWhatsappPhone = doctor?.phone ? doctor.phone.replace(/\D/g, "") : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-background pt-14">
      <Suspense fallback={<AppHeader doctorName={doctor?.name} />}>
        <AppHeader doctorName={doctor?.name} />
      </Suspense>

      <div className="border-b border-border/40">
        <div className="mx-auto flex h-11 max-w-5xl items-center gap-3 px-6">
          {patient ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href={tab ? `/patients/${patient.id}?tab=${tab}` : `/patients/${patient.id}`}>
                  <ArrowLeft className="size-4 mr-1.5" />
                  {patient.name}
                </Link>
              </Button>
              <Separator orientation="vertical" className="h-5" />
              <span className="text-sm text-foreground/60 truncate">{t("nav.report")}</span>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href={tab ? `/?tab=${tab}` : "/"}>
                  <ArrowLeft className="size-4 mr-1.5" />
                  {t("nav.home")}
                </Link>
              </Button>
              <Separator orientation="vertical" className="h-5" />
              <span className="text-sm text-foreground/60 truncate">{t("informes.quick")}</span>
            </>
          )}
          <Badge variant={statusVariant} className="ml-auto flex items-center gap-1.5 text-xs">
            <StatusIcon className="size-3" />
            {statusLabel}
          </Badge>
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isQuickReport ? t("informes.quick") : t("informePage.title")}
            </h1>
            <p className="mt-1 text-sm text-foreground/60 flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {createdAt}
            </p>
          </div>
          <Button size="sm" asChild className="bg-black text-white hover:bg-black/80">
            <Link href={tab ? `/?tab=${tab}` : "/"}>
              <Home className="size-4 mr-1.5" />
              {t("nav.home")}
            </Link>
          </Button>
        </div>

        {patient && (
          <PatientCard
            patient={patient}
            dobFormatted={dobFormatted}
            patientAge={patientAge}
            yearsOldLabel={t("informePage.yearsOld")}
          />
        )}

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
            patientName={patient?.name}
            patientId={patient?.id}
            pdfUrl={pdfUrl}
            whatsappPhone={whatsappPhone}
            whatsappOptedIn={patient?.whatsapp_opted_in}
            doctorName={doctor?.name}
            doctorEmail={doctor?.email}
            doctorPhone={doctorWhatsappPhone}
            isQuickReport={isQuickReport}
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
                  : informe.transcript_type === "monologue"
                  ? t("informePage.monologue")
                  : t("informePage.transcriptFull")}
              </span>
            </summary>
            <div className="border-t px-5 py-6">
              {informe.transcript_type === "monologue" ? (
                <TranscriptMonologue transcript={informe.transcript} />
              ) : informe.transcript_dialog ? (
                <TranscriptDialog
                  dialog={informe.transcript_dialog as DialogTurn[]}
                  patientName={patient?.name ?? "Patient"}
                />
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-card-foreground">
                  {informe.transcript}
                </p>
              )}
            </div>
          </details>
        )}

      </main>

      <AppFooter doctorName={doctor?.name} doctorEmail={user.email} />
    </div>
  );
}
