"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, ArrowLeft, Pencil, X, Save, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MarkdownDisplay } from "@/components/informe-editor/markdown-display";
import { stripMarkdown } from "@/lib/utils";
import { updateQuickInformeDoctorOnly } from "@/actions/informes-rapidos";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuickInformeResultProps {
  informeId: string;
  informe: string;
}

export function QuickInformeResult({ informeId, informe }: QuickInformeResultProps) {
  const t = useTranslations();
  const tEditor = useTranslations("informeEditor");
  const { push } = useRouter();
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // eslint-disable-next-line react-doctor/rerender-state-only-in-handlers -- read transitively via doctorText
  const [edited, setEdited] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const doctorText = edited ?? informe;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(stripMarkdown(doctorText));
      setIsCopied(true);
      toast.success(t("common.copied"), { description: t("informes.copiedToClipboard") });
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error(t("common.error"), { description: t("informes.copyError") });
    }
  };

  function handleEdit() {
    setEdited(informe);
    setIsEditing(true);
  }

  function handleCancel() {
    setEdited(null);
    setIsEditing(false);
  }

  function handleSave() {
    startSaving(async () => {
      const result = await updateQuickInformeDoctorOnly(informeId, doctorText);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(tEditor("saveSuccess"));
        setEdited(null);
        setIsEditing(false);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-card-foreground">{t("informes.doctorReport")}</h3>
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5 h-7">
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  {tEditor("save")}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving} className="gap-1.5 text-muted-foreground h-7">
                  <X className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={handleEdit} aria-label={tEditor("editReport")} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <Pencil className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{tEditor("editReport")}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button onClick={handleCopy} variant="outline" size="sm">
                  {isCopied ? (
                    <>
                      <Check className="size-4 mr-2" />
                      {t("common.copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="size-4 mr-2" />
                      {t("common.copy")}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="rounded-md border bg-background/50 p-4 max-h-[500px] overflow-y-auto">
          {isEditing ? (
            <Textarea
              value={doctorText}
              onChange={(e) => setEdited(e.target.value)}
              disabled={isSaving}
              className="min-h-[320px] resize-y text-sm leading-relaxed bg-background/50 border-border/60 focus-visible:ring-primary/50 font-mono"
              placeholder={tEditor("medicalReportPlaceholder")}
            />
          ) : (
            <MarkdownDisplay text={doctorText} />
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => push("/")} variant="outline" className="flex-1">
          <ArrowLeft className="size-4 mr-2" />
          {t("nav.home")}
        </Button>
        <Button
          onClick={() => push("/quick-informe")}
          className="flex-1"
        >
          {t("informes.createAnother")}
        </Button>
      </div>
    </div>
  );
}
