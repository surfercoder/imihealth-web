import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAuthUser, getDoctor } from "@/lib/cached-queries";
import { getPlanInfo } from "@/actions/subscriptions";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { ProfileForm } from "@/components/profile-form";
import { SubscriptionSection } from "@/components/subscription-section";
import { ReadOnlyBanner } from "@/components/read-only-banner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations("metadata");
  return {
    title: tMeta("profile"),
    description: tMeta("profileDescription"),
  };
}

export default async function ProfilePage() {
  const {
    data: { user },
  } = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const [t, { data: doctor }, plan] = await Promise.all([
    getTranslations("profilePage"),
    getDoctor(user.id),
    getPlanInfo(user.id),
  ]);

  if (!doctor) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader doctorName={doctor.name} doctorAvatar={doctor.avatar} plan={plan} />
      <ReadOnlyBanner plan={plan} />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-20">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            {t("backHome")}
          </Link>
        </div>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <div className="space-y-6">
          <SubscriptionSection plan={plan} />
          <ProfileForm doctor={doctor} />
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
