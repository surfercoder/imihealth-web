import type { Metadata } from "next";
import { SignupForm } from "@/components/signup-form";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/public-header";

export const metadata: Metadata = {
  title: "Crear cuenta | IMI",
  description: "Crear una cuenta en IMI",
};

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const t = await getTranslations("signupPage");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 pt-20">
      <PublicHeader />
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            {t("subtitle")}
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
