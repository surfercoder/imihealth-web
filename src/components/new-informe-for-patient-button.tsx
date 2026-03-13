"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createInforme } from "@/actions/informes";
import { useTranslations } from "next-intl";
import { usePlan } from "@/contexts/plan-context";

interface NewInformeForPatientButtonProps {
  patientId: string;
}

export function NewInformeForPatientButton({ patientId }: NewInformeForPatientButtonProps) {
  const t = useTranslations("newInformeButton");
  const tMvp = useTranslations("mvpLimits");
  const plan = usePlan();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await createInforme(patientId);
      if (result.error || !result.data) {
        setError(result.error ?? t("error"));
        return;
      }
      router.push(`/informes/${result.data.id}/grabar`);
    });
  }

  if (!plan.canCreateInforme) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button size="sm" disabled>
          <Lock className="size-4 mr-1.5" />
          {t("submit")}
        </Button>
        <p className="text-xs text-muted-foreground max-w-[240px] text-right">
          {tMvp("informeLimitMessage", { max: plan.maxInformes })}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={handleClick} disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="size-4 mr-1.5 animate-spin" />
            {t("creating")}
          </>
        ) : (
          <>
            <Plus className="size-4 mr-1.5" />
            {t("submit")}
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
