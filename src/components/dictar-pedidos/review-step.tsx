"use client";

import { FileText, Loader2, Mic } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseItemsText } from "./state";

interface ReviewStepProps {
  itemsText: string;
  diagnostico: string;
  isPending: boolean;
  onItemsChange: (value: string) => void;
  onDiagnosticoChange: (value: string) => void;
  onRecordAgain: () => void;
  onGenerate: () => void;
}

export function ReviewStep({
  itemsText,
  diagnostico,
  isPending,
  onItemsChange,
  onDiagnosticoChange,
  onRecordAgain,
  onGenerate,
}: ReviewStepProps) {
  const t = useTranslations("dictarPedidos");
  const itemCount = parseItemsText(itemsText).length;

  return (
    <>
      <div className="grid gap-4 py-2">
        <div className="grid gap-1.5">
          <Label htmlFor="dictar-items">{t("itemsLabel")}</Label>
          <Textarea
            id="dictar-items"
            placeholder={t("itemsPlaceholder")}
            value={itemsText}
            onChange={(e) => onItemsChange(e.target.value)}
            disabled={isPending}
            rows={5}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {t("itemsHint", { count: itemCount })}
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="dictar-diagnostico">{t("diagnosticoLabel")}</Label>
          <Textarea
            id="dictar-diagnostico"
            placeholder={t("diagnosticoPlaceholder")}
            value={diagnostico}
            onChange={(e) => onDiagnosticoChange(e.target.value)}
            disabled={isPending}
            rows={2}
          />
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="outline" onClick={onRecordAgain} disabled={isPending}>
          <Mic className="size-4 mr-1.5" />
          {t("recordAgain")}
        </Button>
        <Button onClick={onGenerate} disabled={isPending || itemCount === 0}>
          {isPending ? (
            <>
              <Loader2 className="size-4 mr-1.5 animate-spin" />
              {t("generating")}
            </>
          ) : (
            <>
              <FileText className="size-4 mr-1.5" />
              {t("generate", { count: itemCount })}
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
