import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAuthUser, getDoctor } from "@/lib/cached-queries";
import { getCurrentArsPrice } from "@/actions/subscriptions";
import { getPlanInfo } from "@/actions/subscriptions";
import { AppHeader } from "@/components/app-header";
import { PublicHeader } from "@/components/public-header";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { SubscriptionSection } from "@/components/subscription-section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pricing");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

async function getArsPrices(): Promise<
  { monthly: number; yearly: number } | undefined
> {
  // Fetching MP's exchange rate is best-effort: if MP is unreachable we still
  // render the page with USD prices but without the ARS subtitle.
  try {
    const [monthly, yearly] = await Promise.all([
      getCurrentArsPrice("pro_monthly"),
      getCurrentArsPrice("pro_yearly"),
    ]);
    return { monthly, yearly };
  } catch {
    return undefined;
  }
}

export default async function PricingPage() {
  const [
    t,
    {
      data: { user },
    },
    arsPrices,
  ] = await Promise.all([
    getTranslations("pricing"),
    getAuthUser(),
    getArsPrices(),
  ]);

  const [plan, doctorRes] = user
    ? await Promise.all([getPlanInfo(user.id), getDoctor(user.id)])
    : [null, null];
  const doctor = doctorRes?.data ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-background pt-14">
      {user ? (
        <AppHeader
          doctorName={doctor?.name}
          doctorAvatar={doctor?.avatar}
          plan={
            /* v8 ignore next -- defensive; user truthiness already implies plan is set */
            plan ?? undefined
          }
        />
      ) : (
        <PublicHeader />
      )}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 text-lg text-foreground/60 max-w-2xl mx-auto">
              {t("heroSubtitle")}
            </p>
          </div>
          {plan ? (
            <div className="mb-12 max-w-3xl mx-auto">
              <SubscriptionSection plan={plan} hideUpgradeCta />
            </div>
          ) : null}
          <PricingCards isSignedIn={!!user} arsPrices={arsPrices} />
        </section>
      </main>
    </div>
  );
}
