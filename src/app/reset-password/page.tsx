import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = {
  title: "Restablecer contraseña | IMI",
  description: "Restablecer contraseña de IMI",
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const t = await getTranslations("resetPasswordPage");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 pt-20">
      <AppHeader />
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-bold shadow-lg shadow-primary/30">
            IMI
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-foreground/60">
              {t("subtitle")}
            </p>
          </div>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
