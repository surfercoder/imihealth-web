import type { Metadata } from "next";
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
  Mail,
  FileText,
  Clock,
  AlertCircle,
  Loader2,
  Mic,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { NewInformeForPatientButton } from "@/components/new-informe-for-patient-button";
import { DeleteInformeButton } from "@/components/delete-informe-button";
import { AppHeader } from "@/components/app-header";
import { getPlanInfo } from "@/actions/plan";
import { PlanProvider } from "@/contexts/plan-context";

interface Props {
  params: Promise<{ id: string }>;
}

/* v8 ignore next 14 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("name")
    .eq("id", id)
    .single();

  return {
    title: patient ? `${patient.name} | IMI Health` : "Paciente | IMI Health",
    description: "Historial de consultas del paciente.",
  };
}

const statusIcons = {
  recording: Mic,
  processing: Loader2,
  completed: FileText,
  error: AlertCircle,
};

const statusClasses: Record<string, string> = {
  recording: "text-destructive bg-destructive/10 border-destructive/20",
  processing: "text-primary bg-primary/10 border-primary/20",
  completed: "text-emerald-600 bg-emerald-50 border-emerald-200",
  error: "text-destructive bg-destructive/10 border-destructive/20",
};

export default async function PatientPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [t, { data: doctor }, plan] = await Promise.all([
    getTranslations(),
    supabase.from("doctors").select("name").eq("id", user.id).single(),
    getPlanInfo(),
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

  const dobFormatted = patient.dob
    /* v8 ignore next */
    ? new Date(patient.dob + "T00:00:00").toLocaleDateString(locale === "en" ? "en-US" : "es-AR", {
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

  const completedCount = informes.filter((i) => i.status === "completed").length;

  return (
    <PlanProvider plan={plan}>
    <div className="flex min-h-screen flex-col bg-background pt-14">
      <AppHeader doctorName={doctor?.name} />

      <div className="border-b border-border/40">
        <div className="mx-auto flex h-11 max-w-5xl items-center gap-3 px-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="size-4 mr-1.5" />
              {t("nav.patients")}
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <span className="text-sm font-medium truncate text-foreground">{patient.name}</span>
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 space-y-8">
        {/* Patient card */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-5 flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="size-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-card-foreground">{patient.name}</h1>
              {patientAge !== null && dobFormatted && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {patientAge} {t("patientPage.yearsOld")} · {dobFormatted}
                </p>
              )}
            </div>
            <div className="shrink-0">
              <NewInformeForPatientButton patientId={patient.id} />
            </div>
          </div>

          <Separator />

          <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Phone className="size-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("patientPage.phone")}</p>
                <p className="text-sm font-medium text-card-foreground">{patient.phone}</p>
              </div>
            </div>

            {patient.email && (
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Mail className="size-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("patientPage.email")}</p>
                  <p className="text-sm font-medium text-card-foreground truncate">{patient.email}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="size-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("patientPage.consults")}</p>
                <p className="text-sm font-medium text-card-foreground">
                  {t("patientPage.consultsCount", { total: informes.length, completed: completedCount })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Informes history */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">{t("patientPage.history")}</h2>
            <Badge variant="secondary" className="text-xs">
              {informes.length} {informes.length === 1 ? t("patientPage.consult") : t("patientPage.consults2")}
            </Badge>
          </div>

          {informes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-12 text-center shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                <FileText className="size-6" />
              </div>
              <p className="font-medium text-card-foreground">{t("patientPage.noConsults")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("patientPage.noConsultsHint")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {informes.map((informe) => {
                const statusKey = informe.status as keyof typeof statusIcons;
                const StatusIcon = statusIcons[statusKey] ?? AlertCircle;
                const statusClass = statusClasses[informe.status] ?? statusClasses.error;
                const statusLabel = t(`status.${statusKey}` as Parameters<typeof t>[0]);
                const href =
                  informe.status === "recording"
                    ? `/informes/${informe.id}/grabar`
                    : `/informes/${informe.id}`;

                /* v8 ignore next */
                const date = new Date(informe.created_at).toLocaleDateString(locale === "en" ? "en-US" : "es-AR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                const preview =
                  informe.informe_doctor
                    ? informe.informe_doctor.slice(0, 120).replace(/\n/g, " ") + "…"
                    : null;

                return (
                  <div
                    key={informe.id}
                    className="group relative flex items-start gap-4 rounded-xl border bg-card px-5 py-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <Link href={href} className="absolute inset-0 rounded-xl" aria-label={`${t("nav.report")} ${date}`} />

                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5 relative z-10 pointer-events-none">
                      <FileText className="size-4" />
                    </div>

                    <div className="flex-1 min-w-0 relative z-10 pointer-events-none">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass}`}
                        >
                          <StatusIcon
                            className={`size-3 ${informe.status === "processing" ? "animate-spin" : ""}`}
                          />
                          {statusLabel}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {date}
                        </span>
                      </div>
                      {preview && (
                        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {preview}
                        </p>
                      )}
                    </div>

                    <div className="relative z-10 self-center">
                      <DeleteInformeButton informeId={informe.id} date={date} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-center px-6 text-sm text-foreground/50">
          {t("common.copyright", { year: new Date().getFullYear() })}
        </div>
      </footer>
    </div>
    </PlanProvider>
  );
}
