import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getAuthUser } from "@/lib/cached-queries";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getTranslations, getLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
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
  stripMarkdown,
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
  const [{ id }, searchParamsResolved, authResult, supabase, t] = await Promise.all([
    params,
    searchParams,
    getAuthUser(),
    createClient(),
    getTranslations(),
  ]);
  const tab = searchParamsResolved.tab;
  const {
    data: { user },
  } = authResult;

  if (!user) redirect("/login");

  const { data: patient, error } = await supabase
    .from("patients")
    .select(
      `id, name, dni, email, phone, dob, obra_social, nro_afiliado, plan, created_at,
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
  const lastInforme = informes[0] ?? null;
  const patientWithStats = {
    id: patient.id,
    name: patient.name,
    dni: patient.dni,
    email: patient.email,
    phone: patient.phone,
    dob: patient.dob,
    obra_social: patient.obra_social,
    nro_afiliado: patient.nro_afiliado,
    plan: patient.plan,
    created_at: patient.created_at,
    informe_count: informes.length,
    last_informe_at: lastInforme?.created_at ?? null,
    last_informe_status: lastInforme?.status ?? null,
  };

  const informeItems: InformeHistoryItemData[] = informes.map((informe) => {
    const d = new Date(informe.created_at);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return {
      id: informe.id,
      status: informe.status,
      href: buildInformeHref(informe.id, informe.status, tab),
      date: formatInformeDate(informe.created_at, locale),
      dateSearch: `${dd}/${mm}/${yyyy}`,
      preview: buildInformePreview(informe.informe_doctor),
      statusLabel: t(`status.${informe.status}` as Parameters<typeof t>[0]),
      rawText: informe.informe_doctor ? stripMarkdown(informe.informe_doctor) : null,
    };
  });

  const countLabel = `${informes.length} ${
    informes.length === 1 ? t("patientPage.consult") : t("patientPage.consults2")
  }`;

  return (
    <>
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
          patient={patientWithStats}
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
            searchPlaceholder: t("patientPage.searchPlaceholder"),
            noSearchResults: t("patientPage.noSearchResults"),
          }}
        />
      </main>
    </>
  );
}
