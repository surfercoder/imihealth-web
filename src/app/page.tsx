import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { getTranslations } from "next-intl/server";
import { getAuthUser, getDoctor } from "@/lib/cached-queries";
import { HomeWrapper } from "@/components/home-wrapper";
import { HomeTabs } from "@/components/home-tabs";
import { ReadOnlyBanner } from "@/components/read-only-banner";
import type { PatientWithStats } from "@/actions/patients";
import { getPlanInfo } from "@/actions/subscriptions";
import { getDashboardChartData } from "@/actions/dashboard-charts";
import { PlanProvider } from "@/contexts/plan-context";
import { PublicLandingPage } from "@/components/public-landing-page";
import { InformesTab } from "@/components/tabs/informes-tab";
import { MisPacientesTab } from "@/components/tabs/mis-pacientes-tab";
import { DashboardTab } from "@/components/tabs/dashboard-tab";
import { TabContentSkeleton } from "@/components/tab-content-skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("home"),
    description: t("homeDescription"),
  };
}

export async function PatientsTabServer({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: patientsRaw } = await supabase
    .from("patients")
    .select(
      `id, name, dni, email, phone, dob, obra_social, nro_afiliado, plan, created_at, informes(created_at, status)`
    )
    .eq("doctor_id", userId)
    .order("updated_at", { ascending: false });

  const allPatients: PatientWithStats[] = (patientsRaw ?? []).map((p) => {
    const informes =
      (p.informes as unknown as { created_at: string; status: string }[]) ?? [];
    const sorted = informes.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return {
      id: p.id,
      name: p.name,
      dni: p.dni,
      email: p.email,
      phone: p.phone,
      dob: p.dob,
      obra_social: p.obra_social,
      nro_afiliado: p.nro_afiliado,
      plan: p.plan,
      created_at: p.created_at,
      informe_count: informes.length,
      last_informe_at: sorted[0]?.created_at ?? null,
      last_informe_status: sorted[0]?.status ?? null,
    };
  });

  return <MisPacientesTab patients={allPatients} />;
}

export async function DashboardTabServer({
  userId,
  plan,
}: {
  userId: string;
  plan: Awaited<ReturnType<typeof getPlanInfo>>;
}) {
  const chartData = await getDashboardChartData(userId);

  return (
    <DashboardTab
      totalPatients={chartData?.summary.totalPatients ?? 0}
      totalInformes={plan.currentInformes}
      completedCount={chartData?.summary.completedCount ?? 0}
      processingCount={chartData?.summary.processingCount ?? 0}
      errorCount={chartData?.summary.errorCount ?? 0}
      plan={plan}
      chartData={chartData}
    />
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; tab?: string }>;
}) {
  const [params, authResult] = await Promise.all([searchParams, getAuthUser()]);
  const showWelcome = params.welcome === "true";
  const activeTab = params.tab || "informes";

  const {
    data: { user },
  } = authResult;

  if (!user) {
    return <PublicLandingPage />;
  }

  // Only await what the shell needs — everything else streams via Suspense
  const [t, { data: doctor }, plan] = await Promise.all([
    getTranslations(),
    getDoctor(user.id),
    getPlanInfo(user.id),
  ]);

  return (
    <PlanProvider plan={plan}>
      <HomeWrapper userName={doctor?.name} showWelcome={showWelcome}>
        <ReadOnlyBanner plan={plan} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
          <HomeTabs
            initialTab={activeTab}
            translations={{
              informes: t("tabs.informes"),
              misPacientes: t("tabs.misPacientes"),
              dashboard: t("tabs.dashboard"),
            }}
            informesContent={<InformesTab />}
            patientsContent={
              <Suspense fallback={<TabContentSkeleton variant="patients" />}>
                <PatientsTabServer userId={user.id} />
              </Suspense>
            }
            dashboardContent={
              <Suspense fallback={<TabContentSkeleton variant="dashboard" />}>
                <DashboardTabServer userId={user.id} plan={plan} />
              </Suspense>
            }
          />
        </main>
      </HomeWrapper>
    </PlanProvider>
  );
}
