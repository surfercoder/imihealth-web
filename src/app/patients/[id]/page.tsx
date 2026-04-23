import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getTranslations, getLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { getPlanInfo } from "@/actions/plan";
import { PlanProvider } from "@/contexts/plan-context";
import { PatientInfoCard } from "@/components/patient-page/patient-info-card";
import {
  InformesHistory,
} from "@/components/patient-page/informes-history";
import type { InformeHistoryItemData } from "@/components/patient-page/informe-history-item";
import {
  buildInformeHref,
  buildInformePreview,
  computePatientAge,
  formatInformeDate,
  formatPatientDob,
} from "@/components/patient-page/patient-utils";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

/* v8 ignore next 16 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ id }, supabase, tMeta] = await Promise.all([params, createClient(), getTranslations("metadata")]);
  const { data: patient } = await supabase
    .from("patients")
    .select("name")
    .eq("id", id)
    .single();

  return {
    title: patient ? tMeta("patient", { name: patient.name }) : tMeta("patientFallback"),
    description: tMeta("patientDescription"),
  };
}

export default async function PatientPage({ params, searchParams }: Props) {
  const { id } = await params;
  const searchParamsResolved = await searchParams;
  const tab = searchParamsResolved.tab;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [t, { data: doctor }, plan] = await Promise.all([
    getTranslations(),
    supabase.from("doctors").select("name").eq("id", user.id).single(),
    getPlanInfo(user.id),
  ]);

  const { data: patient, error } = await supabase
    .from("patients")
    .select(
      `id, name, email, phone, dob, created_at,
       informes(id, status, created_at, informe_doctor, informe_paciente)`
    )
    .eq("id", id)
    .eq("doctor_id", user.id)
    .single();

  if (error || !patient) notFound();

  const informes = (
    patient.informes as unknown as {
      id: string;
      status: string;
      created_at: string;
      informe_doctor: string | null;
      informe_paciente: string | null;
    }[]
  ).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const locale = await getLocale();
  const dobFormatted = formatPatientDob(patient.dob, locale);
  const patientAge = computePatientAge(patient.dob);
  const completedCount = informes.filter((i) => i.status === "completed").length;

  const informeItems: InformeHistoryItemData[] = informes.map((informe) => ({
    id: informe.id,
    status: informe.status,
    href: buildInformeHref(informe.id, informe.status, tab),
    date: formatInformeDate(informe.created_at, locale),
    preview: buildInformePreview(informe.informe_doctor),
    statusLabel: t(`status.${informe.status}` as Parameters<typeof t>[0]),
  }));

  const countLabel = `${informes.length} ${
    informes.length === 1 ? t("patientPage.consult") : t("patientPage.consults2")
  }`;

  return (
    <PlanProvider plan={plan}>
      <div className="flex min-h-screen flex-col bg-background pt-14">
        <Suspense fallback={<AppHeader doctorName={doctor?.name} />}>
          <AppHeader doctorName={doctor?.name} />
        </Suspense>

        <div className="border-b border-border/40">
          <div className="mx-auto flex h-11 max-w-5xl items-center gap-3 px-6">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/?tab=${tab || "misPacientes"}`}>
                <ArrowLeft className="size-4 mr-1.5" />
                {t("nav.patients")}
              </Link>
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-sm font-medium truncate text-foreground">{patient.name}</span>
          </div>
        </div>

        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 space-y-8">
          <PatientInfoCard
            patientId={patient.id}
            name={patient.name}
            email={patient.email}
            phone={patient.phone}
            patientAge={patientAge}
            dobFormatted={dobFormatted}
            labels={{
              yearsOld: t("patientPage.yearsOld"),
              phone: t("patientPage.phone"),
              email: t("patientPage.email"),
              consults: t("patientPage.consults"),
              consultsCount: t("patientPage.consultsCount", {
                total: informes.length,
                completed: completedCount,
              }),
            }}
          />

          <InformesHistory
            informes={informeItems}
            labels={{
              history: t("patientPage.history"),
              countLabel,
              noConsults: t("patientPage.noConsults"),
              noConsultsHint: t("patientPage.noConsultsHint"),
              reportLinkLabel: t("nav.report"),
            }}
          />
        </main>

        <AppFooter doctorName={doctor?.name} doctorEmail={user.email} />
      </div>
    </PlanProvider>
  );
}
