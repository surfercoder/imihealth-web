import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { RealtimeNotificationsProvider } from "@/providers/realtime-notifications-provider";
import { SentryErrorBoundary } from "@/components/sentry-error-boundary";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { getAuthUser, getDoctor } from "@/lib/cached-queries";
import { getPlanInfo } from "@/actions/subscriptions";
import { PlanProvider } from "@/contexts/plan-context";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("defaultTitle"),
    description: t("defaultDescription"),
    manifest: "/manifest.webmanifest",
    icons: {
      icon: "/icon.png",
      apple: "/apple-icon.png",
    },
    appleWebApp: {
      capable: true,
      title: "IMI Health",
      statusBarStyle: "default",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, messages, { data: { user } }] = await Promise.all([
    getLocale(),
    getMessages(),
    getAuthUser(),
  ]);

  let shell: React.ReactNode = (
    <ViewTransition name="page-content">{children}</ViewTransition>
  );

  if (user) {
    const [{ data: doctor }, plan] = await Promise.all([
      getDoctor(user.id),
      getPlanInfo(user.id),
    ]);
    const headerProps = {
      doctorName: doctor?.name,
      doctorAvatar: doctor?.avatar,
      plan,
    };
    shell = (
      <PlanProvider plan={plan}>
        <div className="flex min-h-screen flex-col bg-background pt-14">
          <Suspense fallback={<AppHeader {...headerProps} />}>
            <AppHeader {...headerProps} />
          </Suspense>
          <ViewTransition name="page-content">{children}</ViewTransition>
          <AppFooter doctorName={doctor?.name} doctorEmail={user.email} />
        </div>
      </PlanProvider>
    );
  }

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SentryErrorBoundary>
            <RealtimeNotificationsProvider userId={user?.id ?? null}>
              {shell}
            </RealtimeNotificationsProvider>
          </SentryErrorBoundary>
          <Toaster position="bottom-right" richColors={false} />
          <SpeedInsights />
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
