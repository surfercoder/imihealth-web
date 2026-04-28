import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/public-header";
import { PricingCards } from "@/components/pricing/pricing-cards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pricing");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function PricingPage() {
  const t = await getTranslations("pricing");

  return (
    <div className="flex min-h-screen flex-col bg-background pt-14">
      <PublicHeader />
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
          <PricingCards />
        </section>
      </main>
    </div>
  );
}
