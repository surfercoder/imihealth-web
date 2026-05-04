import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getAuthUser } from "@/lib/cached-queries";
import { getTranslations } from "next-intl/server";
import { AlertCircle, ArrowLeft, Loader2, Mic } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { QuickInformeResult } from "@/components/quick-informe-result";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations("metadata");
  return {
    title: tMeta("informeRapido"),
    description: tMeta("informeRapidoDescription"),
  };
}

export default async function InformeRapidoPage({ params }: Props) {
  const [{ id }, authResult, supabase, t] = await Promise.all([
    params,
    getAuthUser(),
    createClient(),
    getTranslations(),
  ]);
  const {
    data: { user },
  } = authResult;

  if (!user) redirect("/login");

  const { data: informe, error } = await supabase
    .from("informes_rapidos")
    .select("id, status, informe_doctor, created_at")
    .eq("id", id)
    .eq("doctor_id", user.id)
    .single();

  if (error || !informe) notFound();

  return (
    <>
      <div className="border-b border-border/40">
        <div className="mx-auto flex h-11 max-w-3xl items-center gap-3 px-6">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-foreground hover:text-foreground"
          >
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
            {t("informes.doctorReport")}
          </h1>
          <p className="mt-1 text-foreground/60">{t("informes.quickDesc")}</p>
        </div>

        {informe.status === "processing" && (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-16 text-center shadow-sm">
            <Loader2 className="size-10 text-primary animate-spin mb-4" />
            <p className="font-medium text-card-foreground">
              {t("status.processing")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("informes.quickProcessingHint")}
            </p>
          </div>
        )}

        {informe.status === "error" && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 p-16 text-center">
            <AlertCircle className="size-10 text-destructive mb-4" />
            <p className="font-medium text-destructive">
              {t("status.error")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("informes.quickErrorHint")}
            </p>
            <Button
              asChild
              className="mt-6 bg-gray-950 text-white hover:bg-gray-950/80"
            >
              <Link href="/quick-informe">
                <Mic className="size-4 mr-1.5" />
                {t("informes.createAnother")}
              </Link>
            </Button>
          </div>
        )}

        {informe.status === "completed" && informe.informe_doctor && (
          <QuickInformeResult informeId={informe.id} informe={informe.informe_doctor} />
        )}
      </main>
    </>
  );
}
