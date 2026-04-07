import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/public-header";
import imiBotFront from "@/../public/assets/images/imi-bot-look-front-transparent.webp";
import imiBotRight from "@/../public/assets/images/imi-bot-look-right-transparent.webp";
import imiBotLeft from "@/../public/assets/images/imi-bot-look-left-transparent.webp";
import imiBotDown from "@/../public/assets/images/imi-boot-look-down-transparent.webp";
import {
  FEATURES,
  BENEFITS,
  buildFaqItems,
} from "@/components/public-landing-page/landing-data";
import { HowSection } from "@/components/public-landing-page/how-section";

const FeedbackDialog = dynamic(
  () => import("@/components/feedback-dialog").then((mod) => mod.FeedbackDialog),
);
const LandingFaq = dynamic(
  () => import("@/components/landing-faq").then((mod) => mod.LandingFaq),
);

export async function PublicLandingPage() {
  const t = await getTranslations("landing");
  const tNav = await getTranslations("nav");
  const faqItems = buildFaqItems(t);

  return (
    <div className="flex min-h-screen flex-col bg-background pt-14">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <Image
              src={imiBotFront}
              alt="IMI Bot"
              width={140}
              height={140}
              className="mx-auto mb-6 drop-shadow-lg "
              priority
            />
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 text-lg text-foreground/60">{t("heroSubtitle")}</p>
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

        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <div className="mb-10 flex items-center justify-center gap-4">
              <Image
                src={imiBotRight}
                alt="IMI Bot"
                width={72}
                height={72}
                className="drop-shadow-md "
              />
              <h2 className="text-2xl font-semibold tracking-tight">
                {t("featuresTitle")}
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
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

        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="mb-10 flex items-center justify-center gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("benefitsTitle")}
            </h2>
            <Image
              src={imiBotLeft}
              alt="IMI Bot"
              width={72}
              height={72}
              className="drop-shadow-md "
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <div key={b.titleKey} className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <b.icon className="size-5" />
                </div>
                <h3 className="font-semibold text-card-foreground">{t(b.titleKey)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(b.descKey)}</p>
              </div>
            ))}
          </div>
        </section>

        <HowSection t={t} />

        <section className="mx-auto max-w-5xl px-6 py-16 text-center">
          <Image
            src={imiBotDown}
            alt="IMI Bot"
            width={100}
            height={100}
            className="mx-auto mb-4 drop-shadow-md "
          />
          <h2 className="text-2xl font-semibold tracking-tight">{t("ctaTitle")}</h2>
          <p className="mt-2 text-foreground/60">{t("ctaSubtitle")}</p>
          <div className="mt-6">
            <Button size="lg" asChild>
              <Link href="/signup">{t("signUp")}</Link>
            </Button>
          </div>
        </section>

        <LandingFaq title={t("faqTitle")} items={faqItems} />
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <p className="text-sm text-foreground/60">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex items-center gap-3">
            <FeedbackDialog doctorName={null} doctorEmail={null} />
            <Link href="/manifest" className="text-sm text-foreground/60 hover:text-foreground transition-colors">
              {tNav("manifest")}
            </Link>
            <Link href="/login" className="text-sm text-foreground/60 hover:text-foreground transition-colors">
              {t("signIn")}
            </Link>
            <Link href="/signup" className="text-sm text-foreground/60 hover:text-foreground transition-colors">
              {t("signUp")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
