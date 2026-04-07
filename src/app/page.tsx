import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { getTranslations } from "next-intl/server";
import { HomeWrapper } from "@/components/home-wrapper";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { HomeTabs } from "@/components/home-tabs";
import type { PatientWithStats } from "@/actions/patients";
import { getPlanInfo } from "@/actions/plan";
import { PlanProvider } from "@/contexts/plan-context";
import { getDashboardChartData } from "@/actions/dashboard-charts";
import { PublicLandingPage } from "@/components/public-landing-page";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      title: "IMI Health",
      description: "AI-powered medical consultation reports",
    };
  }

  return {
    title: "Inicio | IMI Health",
    description: "Panel principal de IMI Health",
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const showWelcome = params.welcome === "true";
  const activeTab = params.tab || "informes";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <PublicLandingPage />;
  }

  const [t, { data: doctor }, { data: informes }, plan, chartData] = await Promise.all([
    getTranslations(),
    supabase.from("doctors").select("name").eq("id", user.id).single(),
    supabase.from("informes").select("id, status").eq("doctor_id", user.id),
    getPlanInfo(),
    getDashboardChartData(),
  ]);

  const allInformes = informes ?? [];
  const completedCount = allInformes.filter((i) => i.status === "completed").length;
  const processingCount = allInformes.filter((i) => i.status === "processing").length;
  const errorCount = allInformes.filter((i) => i.status === "error").length;

  const { data: patientsRaw } = await supabase
    .from("patients")
    .select(`id, name, dni, email, phone, dob, created_at, informes(created_at, status)`)
    .eq("doctor_id", user.id)
    .order("updated_at", { ascending: false });

  const allPatients: PatientWithStats[] = (patientsRaw ?? []).map((p) => {
    const informes = (p.informes as unknown as { created_at: string; status: string }[]) ?? [];
    const sorted = informes.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return {
      id: p.id,
      name: p.name,
      dni: p.dni,
      email: p.email,
      phone: p.phone,
      dob: p.dob,
      created_at: p.created_at,
      informe_count: informes.length,
      last_informe_at: sorted[0]?.created_at ?? null,
      last_informe_status: sorted[0]?.status ?? null,
    };
  });

  return (
    <PlanProvider plan={plan}>
      <HomeWrapper userName={doctor?.name} showWelcome={showWelcome}>
        <div className="flex min-h-screen flex-col bg-background pt-14">
          <Suspense fallback={<AppHeader doctorName={doctor?.name} />}>
            <AppHeader doctorName={doctor?.name} />
          </Suspense>

          <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
            <Suspense>
            <HomeTabs
              activeTab={activeTab}
              patients={allPatients}
              totalInformes={allInformes.length}
              completedCount={completedCount}
              processingCount={processingCount}
              errorCount={errorCount}
              plan={plan}
              chartData={chartData}
              translations={{
                informes: t("tabs.informes"),
                misPacientes: t("tabs.misPacientes"),
                dashboard: t("tabs.dashboard"),
              }}
            />
            </Suspense>
          </main>

          <AppFooter doctorName={doctor?.name} doctorEmail={user.email} />
        </div>
      </HomeWrapper>
    </PlanProvider>
  );
}
