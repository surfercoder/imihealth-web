import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { SignupStatusPoller } from "@/components/billing/signup-status-poller";
import { reconcilePreapproval } from "@/lib/billing/reconcile";
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

interface ResolvedReturn {
  // Either the user's account is fully materialized and we can show the ready
  // state, or we still need the poller as a fallback.
  ready: boolean;
  refId: string | null;
}

// MP redirects to back_url with `preapproval_id` (and sometimes
// `external_reference`) — never our own `ref`. When we have a preapproval id
// we run the full reconciliation server-side BEFORE rendering, so the user
// is materialized by the time they see this page even if the webhook hasn't
// fired (or never will). Falling back to the poller keeps us safe in edge
// cases (MP rate-limits us, the API is briefly down, etc.).
async function resolveReturn(params: {
  ref?: string;
  external_reference?: string;
  preapproval_id?: string;
}): Promise<ResolvedReturn> {
  if (params.preapproval_id) {
    try {
      const result = await reconcilePreapproval(params.preapproval_id);
      if (
        result.kind === "materialized" ||
        result.kind === "subscription-updated"
      ) {
        return { ready: true, refId: null };
      }
      if (result.kind === "pending-signup-waiting") {
        return { ready: false, refId: result.pendingSignupId };
      }
      if (
        result.kind === "pending-signup-cancelled" ||
        result.kind === "stale" ||
        result.kind === "no-ref"
      ) {
        return { ready: false, refId: null };
      }
    } catch (err) {
      // Reconcile failed (e.g. MP API blip). Fall back to polling so the
      // webhook can still complete the materialization.
      Sentry.captureException(err, {
        tags: { flow: "billing-return-reconcile" },
        extra: { preapproval_id: params.preapproval_id },
      });
      try {
        const preapproval = await getPreapproval(params.preapproval_id);
        return { ready: false, refId: preapproval.external_reference || null };
      } catch (innerErr) {
        Sentry.captureException(innerErr, {
          tags: { flow: "billing-return-fallback" },
          extra: { preapproval_id: params.preapproval_id },
        });
        return { ready: false, refId: null };
      }
    }
  }

  return {
    ready: false,
    refId: params.ref ?? params.external_reference ?? null,
  };
}

export default async function BillingReturnPage({ searchParams }: PageProps) {
  const t = await getTranslations("pricing");
  const params = await searchParams;
  const { ready, refId } = await resolveReturn(params);

  if (ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            {t("returnReadyTitle")}
          </h1>
          <p className="mt-3 text-foreground/60">
            {t("returnReadyDescription")}
          </p>
          <Button asChild className="mt-8">
            <Link href="/login">{t("returnReadyCta")}</Link>
          </Button>
        </div>
      </div>
    );
  }

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
