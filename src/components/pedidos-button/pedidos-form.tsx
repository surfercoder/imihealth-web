"use client";

import { FileText, Loader2 } from "lucide-react";
import type { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Action, State } from "./state";
import { parseItems } from "./state";

interface PedidosFormProps {
  state: State;
  dispatch: React.Dispatch<Action>;
  isPending: boolean;
  onCancel: () => void;
  onGenerate: () => void;
  t: ReturnType<typeof useTranslations>;
}

export function PedidosForm({
  state,
  dispatch,
  isPending,
  onCancel,
  onGenerate,
  t,
}: PedidosFormProps) {
  const itemCount = parseItems(state.items).length;

  return (
    <>
      <div className="grid gap-4 py-2">
        <div className="grid gap-1.5">
          <Label htmlFor="pedidos-items">{t("itemsLabel")}</Label>
          <Textarea
            id="pedidos-items"
            placeholder={t("itemsPlaceholder")}
            value={state.items}
            onChange={(e) => dispatch({ type: "SET_ITEMS", value: e.target.value })}
            disabled={isPending}
            rows={8}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {t("itemsHint", { count: itemCount })}
          </p>
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
