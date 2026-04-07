"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type UseFormReturn } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COUNTRIES } from "@/components/ui/phone-input";
import { PhoneField } from "./phone-field";
import type { PatientFormValues } from "./schema";

type Country = (typeof COUNTRIES)[number];

type ClassicReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<PatientFormValues>;
  isLoadingClassic: boolean;
  error: string | null;
  defaultCountry: Country;
  onCancel: () => void;
  onSubmit: (values: PatientFormValues) => Promise<void>;
};

export function ClassicReportDialog({
  open,
  onOpenChange,
  form,
  isLoadingClassic,
  error,
  defaultCountry,
  onCancel,
  onSubmit,
}: ClassicReportDialogProps) {
  const t = useTranslations();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = form;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("nuevoInformeDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("nuevoInformeDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              {t("nuevoInformeDialog.fullName")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder={t("nuevoInformeDialog.fullNamePlaceholder")}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dni">
              {t("nuevoInformeDialog.dni")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dni"
              type="text"
              inputMode="numeric"
              placeholder={t("nuevoInformeDialog.dniPlaceholder")}
              {...register("dni")}
            />
            {errors.dni && (
              <p className="text-xs text-destructive">{errors.dni.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dob">
              {t("nuevoInformeDialog.dob")}{" "}
              <span className="text-muted-foreground text-xs">
                ({t("nuevoInformeDialog.optional")})
              </span>
            </Label>
            <Input id="dob" type="date" {...register("dob")} />
            {errors.dob && (
              <p className="text-xs text-destructive">{errors.dob.message}</p>
            )}
          </div>

          <PhoneField
            control={control}
            isLoadingClassic={isLoadingClassic}
            defaultCountry={defaultCountry}
            error={errors.phone}
          />

          <div className="space-y-1.5">
            <Label htmlFor="email">{t("nuevoInformeDialog.email")}</Label>
            <Input
              id="email"
              type="text"
              placeholder={t("nuevoInformeDialog.emailPlaceholder")}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

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
              onClick={onCancel}
              disabled={isLoadingClassic}
            >
              {t("nuevoInformeDialog.cancel")}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoadingClassic}
            >
              {isLoadingClassic ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                  {t("nuevoInformeDialog.creating")}
                </>
              ) : (
                t("nuevoInformeDialog.submit")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
