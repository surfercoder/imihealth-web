import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LogOut, FileText, CheckCircle2, Clock, AlertCircle, Users } from "lucide-react";
import { NuevoInformeDialog } from "@/components/nuevo-informe-dialog";
import { PatientsList } from "@/components/patients-list";
import { PatientSearch } from "@/components/patient-search";
import { HomeWrapper } from "@/components/home-wrapper";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { PatientWithStats } from "@/actions/patients";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Inicio | IMI",
  description: "Panel principal de IMI",
};

export default async function Home() {
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
    <HomeWrapper userName={doctor?.name}>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b border-border/60 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
            <span className="text-lg font-bold tracking-tight text-foreground">
              IMI
            </span>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <span className="text-sm text-foreground/60 hidden sm:block">
                {user.email}
              </span>
              <form action={logout}>
                <Button variant="ghost" size="sm" type="submit">
                  <LogOut className="size-4 mr-1.5" />
                  {t("nav.logout")}
                </Button>
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
          <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {t("home.title")}
              </h1>
              <p className="mt-1 text-foreground/60">
                {t("home.subtitle")}
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
                <div className="flex size-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
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

          <div className="mb-4 flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <h2 className="text-base font-semibold text-foreground shrink-0">{t("home.patientsTitle")}</h2>
            <PatientSearch className="flex-1 min-w-0" />
          </div>

          <PatientsList patients={allPatients} />
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
