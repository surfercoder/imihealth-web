import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanInfo } from "@/actions/plan";

interface Props {
  plan: PlanInfo;
}

export async function ReadOnlyBanner({ plan }: Props) {
  if (!plan.isReadOnly) return null;
  const t = await getTranslations("subscription");

  return (
    <div
      role="alert"
      className="mx-auto mt-4 max-w-5xl rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 sm:px-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-foreground">
              {t("readOnlyBannerTitle")}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("readOnlyBannerMessage")}
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="self-start sm:self-center">
          <Link href="/pricing">{t("reactivateCta")}</Link>
        </Button>
      </div>
    </div>
  );
}
