import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pricing");
  return {
    title: t("returnTitle"),
    description: t("returnDescription"),
  };
}

export default async function BillingReturnPage() {
  const t = await getTranslations("pricing");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("returnTitle")}
        </h1>
        <p className="mt-3 text-foreground/60">{t("returnDescription")}</p>
        <Button asChild className="mt-8">
          <Link href="/">{t("returnCta")}</Link>
        </Button>
      </div>
    </div>
  );
}
