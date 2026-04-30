import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { SignupStatusPoller } from "@/components/billing/signup-status-poller";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pricing");
  return {
    title: t("returnTitle"),
    description: t("returnDescription"),
  };
}

interface PageProps {
  searchParams: Promise<{ ref?: string }>;
}

export default async function BillingReturnPage({ searchParams }: PageProps) {
  const t = await getTranslations("pricing");
  const { ref } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      {ref ? (
        <SignupStatusPoller refId={ref} />
      ) : (
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("returnTitle")}
          </h1>
          <p className="mt-3 text-foreground/60">{t("returnDescription")}</p>
          <Button asChild className="mt-8">
            <Link href="/">{t("returnCta")}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
