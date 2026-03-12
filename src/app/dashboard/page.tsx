import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { FileText, CheckCircle2, Clock, AlertCircle, Users } from "lucide-react";
import { NuevoInformeDialog } from "@/components/nuevo-informe-dialog";
import { DashboardPatientsSection } from "@/components/dashboard-patients-section";
import { HomeWrapper } from "@/components/home-wrapper";
import { AppHeader } from "@/components/app-header";
import type { PatientWithStats } from "@/actions/patients";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Inicio | IMI Health",
  description: "Panel principal de IMI Health",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const params = await searchParams;
  const showWelcome = params.welcome === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [t, { data: doctor }, { data: informes }] = await Promise.all([
    getTranslations(),
    supabase.from("doctors").select("name").eq("id", user.id).single(),
    supabase.from("informes").select("id, status").eq("doctor_id", user.id),
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
    <HomeWrapper userName={doctor?.name} showWelcome={showWelcome}>
      <div className="flex min-h-screen flex-col bg-background pt-14">
        <AppHeader doctorName={doctor?.name} />

        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
          <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {t("home.title")}
              </h1>
              <p className="mt-1 text-foreground/60">
                {t("home.subtitle", { name: doctor?.name?.split(" ")[0] ?? "Doctor" })}
              </p>
            </div>
            <NuevoInformeDialog />
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="size-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">{allPatients.length}</p>
                  <p className="text-xs text-muted-foreground">{t("home.stats.patients")}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FileText className="size-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">{allInformes.length}</p>
                  <p className="text-xs text-muted-foreground">{t("home.stats.totalReports")}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="size-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">{completedCount}</p>
                  <p className="text-xs text-muted-foreground">{t("home.stats.completed")}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`flex size-9 items-center justify-center rounded-lg ${errorCount > 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                  {errorCount > 0 ? (
                    <AlertCircle className="size-4" />
                  ) : (
                    <Clock className="size-4" />
                  )}
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">
                    {errorCount > 0 ? errorCount : processingCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {errorCount > 0 ? t("home.stats.withErrors") : t("home.stats.processing")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator className="mb-6" />

          <h2 className="mb-4 text-base font-semibold text-foreground">{t("home.patientsTitle")}</h2>
          
          <DashboardPatientsSection patients={allPatients} />
        </main>

        <footer className="border-t border-border/60">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-center px-6 text-sm text-foreground/50">
            {t("common.copyright", { year: new Date().getFullYear() })}
          </div>
        </footer>
      </div>
    </HomeWrapper>
  );
}
