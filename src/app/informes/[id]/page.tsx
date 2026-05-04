import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getAuthUser, getDoctor } from "@/lib/cached-queries";
import { Button } from "@/components/ui/button";
import { getTranslations, getLocale } from "next-intl/server";
import { Clock, Home } from "lucide-react";
import Link from "next/link";
import { InformeEditor } from "@/components/informe-editor";
import { PatientCard } from "@/components/informe-page/patient-card";
import { InformeBreadcrumb } from "@/components/informe-page/informe-breadcrumb";
import {
  InformeProcessingPanel,
  InformeErrorPanel,
} from "@/components/informe-page/informe-status-panel";
import {
  formatDob,
  calculateAge,
  formatCreatedAt,
  normalizePhone,
} from "@/components/informe-page/utils";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations("metadata");
  return {
    title: tMeta("informe"),
    description: tMeta("informeDescription"),
  };
}

export default async function InformePage({ params, searchParams }: Props) {
  const [{ id }, { tab }, { data: { user } }] = await Promise.all([
    params,
    searchParams,
    getAuthUser(),
  ]);

  if (!user) redirect("/login");

  const [supabase, t, { data: doctor }, locale] = await Promise.all([
    createClient(),
    getTranslations(),
    getDoctor(user.id),
    getLocale(),
  ]);
  /* v8 ignore next */
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

  const isQuickReport = !informe.patient_id;

  const patient = informe.patients as {
    id: string;
    name: string;
    phone: string;
    dob: string | null;
    email: string | null;
  } | null;

  const dobFormatted = formatDob(patient?.dob ?? null, dateLocale);
  const patientAge = calculateAge(patient?.dob ?? null);
  const createdAt = formatCreatedAt(informe.created_at, dateLocale);
  const statusLabel = t(`status.${informe.status}` as Parameters<typeof t>[0]);

  // Generate PDF URL on-demand via API route (no storage)
  const pdfUrl = (informe.status === "completed" && informe.informe_paciente && patient)
    ? `/api/pdf/informe?id=${id}`
    : null;

  const whatsappPhone = normalizePhone(patient?.phone);
  /* v8 ignore next */
  const doctorWhatsappPhone = normalizePhone(doctor?.phone);

  return (
    <>
      <InformeBreadcrumb
        patient={patient}
        tab={tab}
        reportLabel={t("nav.report")}
        homeLabel={t("nav.home")}
        quickLabel={t("informes.quick")}
        status={informe.status}
        statusLabel={statusLabel}
      />

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
          <Button size="sm" asChild className="bg-gray-950 text-white hover:bg-gray-950/80">
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
          <InformeProcessingPanel
            processingLabel={t("informePage.processing")}
            processingHint={t("informePage.processingHint")}
          />
        )}

        {informe.status === "error" && (
          <InformeErrorPanel
            informeId={id}
            isQuickReport={isQuickReport}
            errorLabel={t("informePage.errorProcessing")}
            errorHint={t("informePage.errorHint")}
            recordAgainLabel={t("informePage.recordAgain")}
          />
        )}

        {informe.status === "completed" && (
          <InformeEditor
            informeId={id}
            informeDoctor={informe.informe_doctor || ""}
            informePaciente={informe.informe_paciente || ""}
            patientName={patient?.name}
            patientEmail={patient?.email}
            pdfUrl={pdfUrl}
            whatsappPhone={whatsappPhone}
            doctorName={doctor?.name}
            doctorEmail={doctor?.email}
            doctorPhone={doctorWhatsappPhone}
            isQuickReport={isQuickReport}
          />
        )}


      </main>
    </>
  );
}
