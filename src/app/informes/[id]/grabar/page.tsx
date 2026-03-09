import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { AudioRecorder } from "@/components/audio-recorder";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Phone, Calendar } from "lucide-react";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = {
  title: "Grabar informe | IMI Health",
  description: "Grabar un nuevo informe médico",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GrabarPage({ params }: Props) {
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

  if (informe.status === "completed") {
    redirect(`/informes/${id}`);
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

  const age = patient.dob
    ? (() => {
        const today = new Date();
        const birth = new Date(patient.dob + "T00:00:00");
        let years = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;
        return years;
      })()
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background pt-14">
      <AppHeader doctorName={doctor?.name} />

      <div className="border-b border-border/40">
        <div className="mx-auto flex h-11 max-w-3xl items-center gap-3 px-6">
          <Button variant="ghost" size="sm" asChild className="text-foreground hover:text-foreground">
            <Link href={`/patients/${patient.id}`}>
              <ArrowLeft className="size-4 mr-1.5" />
              {patient.name}
            </Link>
          </Button>
          <span className="text-sm font-medium text-foreground/60">
            {t("grabarPage.newConsult")}
          </span>
        </div>
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("grabarPage.title")}
          </h1>
          <p className="mt-1 text-foreground/60">
            {t("grabarPage.subtitle")}
          </p>
        </div>

        <div className="mb-8 rounded-xl border bg-card p-5 shadow-sm">
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
                    {dobFormatted}{age !== null && ` (${age} ${t("grabarPage.yearsOld")})`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <AudioRecorder informeId={id} doctorId={user.id} />
        </div>

        <div className="mt-6 rounded-lg border bg-card p-4 text-sm shadow-sm">
          <p className="font-medium mb-1 text-card-foreground">{t("grabarPage.howItWorks")}</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>{t("grabarPage.step1")}</li>
            <li>{t("grabarPage.step2")}</li>
            <li>{t("grabarPage.step3")}</li>
            <li>{t("grabarPage.step4")}</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
