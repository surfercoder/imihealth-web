"use client";

import { useState, useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { updateProfile } from "@/actions/profile";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ProfileHeaderCard } from "@/components/profile-form/profile-header-card";
import { PersonalInfoSection } from "@/components/profile-form/personal-info-section";
import { ProfessionalInfoSection } from "@/components/profile-form/professional-info-section";
import { SignatureSection } from "@/components/profile-form/signature-section";
import {
  buildProfileFormSchema,
  type ProfileFormProps,
  type ProfileFormValues,
} from "@/components/profile-form/schema";

export function ProfileForm({ doctor }: ProfileFormProps) {
  const t = useTranslations("profilePage");
  const v = useTranslations("validation");
  const [state, formAction] = useActionState(updateProfile, null);
  const [isPending, startTransition] = useTransition();
  const [signatureChanged, setSignatureChanged] = useState(false);

  const clientSchema = buildProfileFormSchema(v);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(clientSchema) as never,
    defaultValues: {
      name: doctor.name || "",
      dni: doctor.dni || "",
      matricula: doctor.matricula || "",
      phone: doctor.phone || "",
      especialidad: doctor.especialidad || "",
      firmaDigital: undefined,
    },
  });

  function onSubmit(values: ProfileFormValues) {
    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("dni", values.dni || "");
    formData.set("matricula", values.matricula);
    formData.set("phone", values.phone);
    formData.set("especialidad", values.especialidad);
    if (signatureChanged) {
      formData.set("firmaDigital", values.firmaDigital ?? "");
    }
    startTransition(() => {
      formAction(formData);
      toast.success(t("saveSuccess"));
    });
  }

  return (
    <div className="space-y-6">
      <ProfileHeaderCard doctor={doctor} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("editTitle")}</CardTitle>
          <CardDescription>{t("editDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-6"
              noValidate
            >
              <PersonalInfoSection form={form} email={doctor.email} />

              <Separator />

              <ProfessionalInfoSection form={form} />

              <Separator />

              <SignatureSection
                form={form}
                firmaDigital={doctor.firma_digital}
                signatureChanged={signatureChanged}
                onSignatureChanged={() => setSignatureChanged(true)}
              />

              {state?.error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {state.error}
                </p>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {t("saving")}
                    </>
                  ) : (
                    t("save")
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
