import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { AudioRecorder } from "@/components/audio-recorder";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Informe Rápido | IMI Health",
  description: "Crear un informe rápido sin guardar en base de datos",
};

export default async function QuickInformePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [t, { data: doctor }] = await Promise.all([
    getTranslations(),
    supabase.from("doctors").select("name").eq("id", user.id).single(),
  ]);

  // Create a temporary informe ID for quick reports (using a special prefix)
  const quickInformeId = `quick-${user.id}-${crypto.randomUUID()}`;

  return (
    <div className="flex min-h-screen flex-col bg-background pt-14">
      <Suspense fallback={<AppHeader doctorName={doctor?.name} />}>
        <AppHeader doctorName={doctor?.name} />
      </Suspense>

      <div className="border-b border-border/40">
        <div className="mx-auto flex h-11 max-w-3xl items-center gap-3 px-6">
          <Button variant="ghost" size="sm" asChild className="text-foreground hover:text-foreground">
            <Link href="/">
              <ArrowLeft className="size-4 mr-1.5" />
              {t("nav.home")}
            </Link>
          </Button>
          <span className="text-sm font-medium text-foreground/60">
            {t("informes.quick")}
          </span>
        </div>
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("grabarPage.title")}
          </h1>
          <p className="mt-1 text-foreground/60">
            {t("informes.quickDesc")}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <Suspense>
            <AudioRecorder informeId={quickInformeId} doctorId={user.id} isQuickReport={true} />
          </Suspense>
        </div>

        <div className="mt-6 rounded-lg border bg-card p-4 text-sm shadow-sm">
          <p className="font-medium mb-1 text-card-foreground">{t("grabarPage.howItWorks")}</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>{t("grabarPage.step1")}</li>
            <li>{t("quickInformePage.step2")}</li>
            <li>{t("grabarPage.step3")}</li>
            <li>{t("quickInformePage.step4")}</li>
          </ol>
        </div>
      </main>

      <AppFooter doctorName={doctor?.name} doctorEmail={user.email} />
    </div>
  );
}
