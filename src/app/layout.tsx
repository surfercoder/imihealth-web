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
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SentryErrorBoundary>
            <Suspense>
              <RealtimeNotificationsProvider>
                <ViewTransition name="page-content">
                  {children}
                </ViewTransition>
              </RealtimeNotificationsProvider>
            </Suspense>
          </SentryErrorBoundary>
          <Toaster position="bottom-right" richColors={false} />
          <SpeedInsights />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
