import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { QuickInformeResult } from "@/components/quick-informe-result";

export const metadata: Metadata = {
  title: "Resultado - Informe Rápido | IMI Health",
  description: "Resultado del informe rápido",
};

interface Props {
  searchParams: Promise<{ informe?: string }>;
}

export default async function QuickInformeResultPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { informe } = await searchParams;

  if (!informe) {
    redirect("/quick-informe");
  }

  const [t, { data: doctor }] = await Promise.all([
    getTranslations(),
    supabase.from("doctors").select("name").eq("id", user.id).single(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background pt-14">
      <Suspense fallback={<AppHeader doctorName={doctor?.name} />}>
        <AppHeader doctorName={doctor?.name} />
      </Suspense>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("informes.quick")}
          </h1>
          <p className="mt-1 text-foreground/60">
            {t("informes.quickResultDesc")}
          </p>
        </div>

        <QuickInformeResult informe={decodeURIComponent(informe)} />
      </main>

      <AppFooter doctorName={doctor?.name} doctorEmail={user.email} />
    </div>
  );
}
