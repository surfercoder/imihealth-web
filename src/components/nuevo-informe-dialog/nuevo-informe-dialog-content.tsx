"use client";
"use no memo";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { usePlan } from "@/contexts/plan-context";
import { LimitReachedButton } from "./limit-reached-button";
import { PatientFormFields } from "./patient-form-fields";
import { useNuevoInformeForm } from "./use-nuevo-informe-form";
import type { NuevoInformeDialogProps } from "./types";

export function NuevoInformeDialogContent({
  fullWidth = false,
  variant = "default",
}: NuevoInformeDialogProps = {}) {
  const t = useTranslations("nuevoInformeDialog");
  const plan = usePlan();
  const {
    form,
    open,
    setOpen,
    isLoading,
    error,
    defaultCountry,
    handleOpenChange,
    submit,
  } = useNuevoInformeForm();

  if (!plan.canCreateInforme) {
    return <LimitReachedButton fullWidth={fullWidth} />;
  }

  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size={fullWidth ? "default" : "sm"} variant={variant} className={fullWidth ? "w-full" : ""}>
          {!fullWidth && <Plus className="size-4 mr-1.5" />}
          {t("trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 pt-2">
          <PatientFormFields
            register={register}
            control={control}
            errors={errors}
            isLoading={isLoading}
            defaultCountry={defaultCountry}
          />

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                  {t("creating")}
                </>
              ) : (
                t("submit")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
