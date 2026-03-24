"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deletePatient } from "@/actions/patients";
import { useTranslations } from "next-intl";

interface DeletePatientButtonProps {
  patientId: string;
  patientName: string;
}

export function DeletePatientButton({ patientId, patientName }: DeletePatientButtonProps) {
  const t = useTranslations("deletePatientButton");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deletePatient(patientId);
      if (result?.error) {
        setError(result.error);
        toast.error(t("errorTitle"), {
          description: result.error,
        });
      } else {
        setOpen(false);
        toast.success(t("successTitle"), {
          description: t("successMessage", { name: patientName }),
        });
      }
    });
  }

  function handleOpenChange(val: boolean) {
    if (!isPending) {
      setOpen(val);
      if (!val) setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"

        >
          <Trash2 className="size-4" />
          <span className="sr-only">{t("srLabel")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("confirmTitle")}</DialogTitle>
          <DialogDescription className="text-secondary-foreground">
            {t("confirmDescription", { name: patientName })}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <DialogFooter>
          <Button variant="destructive" onClick={() => handleOpenChange(false)} disabled={isPending}>
            {t("cancel")}
          </Button>
          <Button variant="default" onClick={handleDelete} disabled={isPending}>
            {isPending ? t("deleting") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
