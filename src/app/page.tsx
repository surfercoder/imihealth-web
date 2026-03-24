import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";
import { Mic, FileText, Shield, Smartphone } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { FeedbackDialog } from "@/components/feedback-dialog";

export const metadata: Metadata = {
  title: "IMI Health",
  description: "AI-powered medical consultation reports",
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const t = await getTranslations("landing");
  const tNav = await getTranslations("nav");

  const features = [
    { icon: Mic, titleKey: "feature1Title" as const, descKey: "feature1Desc" as const },
    { icon: FileText, titleKey: "feature2Title" as const, descKey: "feature2Desc" as const },
    { icon: Shield, titleKey: "feature3Title" as const, descKey: "feature3Desc" as const },
    { icon: Smartphone, titleKey: "feature4Title" as const, descKey: "feature4Desc" as const },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background pt-14">
      <PublicHeader />

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 text-lg text-foreground/60">
              {t("heroSubtitle")}
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/signup">{t("getStarted")}</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/login">{t("signIn")}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight">
              {t("featuresTitle")}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <div key={f.titleKey} className="rounded-xl border bg-card p-6 shadow-sm">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="font-semibold text-card-foreground">{t(f.titleKey)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(f.descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{t("ctaTitle")}</h2>
          <p className="mt-2 text-foreground/60">{t("ctaSubtitle")}</p>
          <div className="mt-6">
            <Button size="lg" asChild>
              <Link href="/signup">{t("signUp")}</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <p className="text-sm text-foreground/50">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex items-center gap-3">
            <FeedbackDialog doctorName={null} doctorEmail={null} />
            <Link href="/manifest" className="text-sm text-foreground/50 hover:text-foreground transition-colors">
              {tNav("manifest")}
            </Link>
            <Link href="/login" className="text-sm text-foreground/50 hover:text-foreground transition-colors">
              {t("signIn")}
            </Link>
            <Link href="/signup" className="text-sm text-foreground/50 hover:text-foreground transition-colors">
              {t("signUp")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
