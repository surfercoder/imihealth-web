"use client";

import { FileText, Loader2 } from "lucide-react";
import type { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Action, State } from "./state";

interface CertificadoFormProps {
  state: State;
  dispatch: React.Dispatch<Action>;
  isPending: boolean;
  onCancel: () => void;
  onGenerate: () => void;
  t: ReturnType<typeof useTranslations>;
}

export function CertificadoForm({
  state,
  dispatch,
  isPending,
  onCancel,
  onGenerate,
  t,
}: CertificadoFormProps) {
  return (
    <>
      <div className="grid gap-4 py-2">
        <div className="grid gap-1.5">
          <Label htmlFor="daysOff">{t("daysOffLabel")}</Label>
          <Input
            id="daysOff"
            type="number"
            min={1}
            max={365}
            placeholder={t("daysOffPlaceholder")}
            value={state.daysOff}
            onChange={(e) => dispatch({ type: "SET_FIELD", field: "daysOff", value: e.target.value })}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            {t("daysOffHint")}
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="diagnosis">{t("diagnosisLabel")}</Label>
          <Input
            id="diagnosis"
            placeholder={t("diagnosisPlaceholder")}
            value={state.diagnosis}
            onChange={(e) => dispatch({ type: "SET_FIELD", field: "diagnosis", value: e.target.value })}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            {t("diagnosisHint")}
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="observations">{t("observationsLabel")}</Label>
          <Textarea
            id="observations"
            placeholder={t("observationsPlaceholder")}
            value={state.observations}
            onChange={(e) => dispatch({ type: "SET_FIELD", field: "observations", value: e.target.value })}
            disabled={isPending}
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          {t("cancel")}
        </Button>
        <Button onClick={onGenerate} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 mr-1.5 animate-spin" />
              {t("generating")}
            </>
          ) : (
            <>
              <FileText className="size-4 mr-1.5" />
              {t("generate")}
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
