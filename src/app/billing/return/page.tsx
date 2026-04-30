import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { SignupStatusPoller } from "@/components/billing/signup-status-poller";
import { getPreapproval } from "@/lib/mercadopago/api";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pricing");
  return {
    title: t("returnTitle"),
    description: t("returnDescription"),
  };
}

interface PageProps {
  searchParams: Promise<{
    ref?: string;
    external_reference?: string;
    preapproval_id?: string;
  }>;
}

// MP redirects to back_url with `preapproval_id` (and sometimes `external_reference`)
// — never our own `ref`. We resolve any of those to the pending_signups id the
// poller needs.
async function resolveRefId(params: {
  ref?: string;
  external_reference?: string;
  preapproval_id?: string;
}): Promise<string | null> {
  if (params.ref) return params.ref;
  if (params.external_reference) return params.external_reference;
  if (!params.preapproval_id) return null;
  try {
    const preapproval = await getPreapproval(params.preapproval_id);
    return preapproval.external_reference || null;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { flow: "billing-return" },
      extra: { preapproval_id: params.preapproval_id },
    });
    return null;
  }
}

export default async function BillingReturnPage({ searchParams }: PageProps) {
  const t = await getTranslations("pricing");
  const params = await searchParams;
  const refId = await resolveRefId(params);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      {refId ? (
        <SignupStatusPoller refId={refId} />
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
