import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/public-header";

export const metadata: Metadata = {
  title: "Recuperar contraseña | IMI",
  description: "Recuperar contraseña de IMI",
};

export default async function ForgotPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const t = await getTranslations("forgotPasswordPage");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 pt-20">
      <PublicHeader />
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            {t("subtitle")}
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
