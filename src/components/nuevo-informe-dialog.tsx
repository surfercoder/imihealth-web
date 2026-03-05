"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createPatient, createInforme } from "@/actions/informes";
import { useTranslations } from "next-intl";

type PatientFormValues = {
  name: string;
  dob: string;
  phone: string;
  email?: string;
};

export function NuevoInformeDialog() {
  const t = useTranslations("nuevoInformeDialog");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patientSchema = z.object({
    name: z.string().min(2, t("validation.nameTooShort")),
    dob: z.string().min(1, t("validation.dobRequired")),
    phone: z.string().min(6, t("validation.phoneInvalid")),
    email: z.string().email(t("validation.emailInvalid")).optional().or(z.literal("")),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
  });

  const onSubmit = async (values: PatientFormValues) => {
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("phone", values.phone);
    formData.append("dob", values.dob);
    if (values.email) formData.append("email", values.email);

    const patientResult = await createPatient(formData);
    if (patientResult.error || !patientResult.data) {
      const msg = patientResult.error ?? t("errorPatient");
      setError(msg);
      toast.error(t("errorPatient"), { description: msg });
      setIsLoading(false);
      return;
    }

    const informeResult = await createInforme(patientResult.data.id);
    if (informeResult.error || !informeResult.data) {
      const msg = informeResult.error ?? t("errorInforme");
      setError(msg);
      toast.error(t("errorInforme"), { description: msg });
      setIsLoading(false);
      return;
    }

    setOpen(false);
    reset();
    router.push(`/informes/${informeResult.data.id}/grabar`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          reset();
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4 mr-1.5" />
          {t("trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              {t("fullName")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder={t("fullNamePlaceholder")}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dob">
              {t("dob")} <span className="text-destructive">*</span>
            </Label>
            <Input id="dob" type="date" {...register("dob")} />
            {errors.dob && (
              <p className="text-xs text-destructive">{errors.dob.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">
              {t("phone")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder={t("phonePlaceholder")}
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("phoneHint")}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="text"
              placeholder={t("emailPlaceholder")}
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
              variant="destructive"
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
