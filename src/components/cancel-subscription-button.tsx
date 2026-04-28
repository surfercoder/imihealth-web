"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cancelSubscription } from "@/actions/billing";

export function CancelSubscriptionButton() {
  const t = useTranslations("subscription");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    const result = await cancelSubscription();
    setSubmitting(false);
    if (result.error) {
      toast.error(t("cancelErrorTitle"), { description: result.error });
      return;
    }
    toast.success(t("cancelSuccessTitle"), {
      description: t("cancelSuccessMessage"),
    });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t("cancelCta")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("cancelDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("cancelDialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            {t("cancelDialogCancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? t("cancelLoading") : t("cancelDialogConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
