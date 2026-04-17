import type { Metadata } from "next";
import { SignupForm } from "@/components/signup-form";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/public-header";
import { MVP_LIMITS } from "@/lib/mvp-limits";
import { Lock } from "lucide-react";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations("metadata");
  return {
    title: tMeta("signup"),
    description: tMeta("signupDescription"),
  };
}

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const serviceClient = createServiceClient();
  const [t, tMvp, { count: doctorCount }] = await Promise.all([
    getTranslations("signupPage"),
    getTranslations("mvpLimits"),
    serviceClient.from("doctors").select("id", { count: "exact", head: true }),
  ]);

  /* v8 ignore next */
  const limitReached = (doctorCount ?? 0) >= MVP_LIMITS.MAX_DOCTORS;

  if (limitReached) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 pt-20">
        <PublicHeader />
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center gap-5 text-center rounded-xl border bg-card p-10 shadow-sm">
            <div className="flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Lock className="size-7" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {tMvp("signupLimitTitle")}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {tMvp("signupLimitMessage", { max: MVP_LIMITS.MAX_DOCTORS })}
              </p>
            </div>
            <Link
              href="/login"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              {tMvp("backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
