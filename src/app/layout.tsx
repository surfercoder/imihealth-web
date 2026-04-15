import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { RealtimeNotificationsProvider } from "@/providers/realtime-notifications-provider";
import { SentryErrorBoundary } from "@/components/sentry-error-boundary";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { createClient } from "@/utils/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "IMI Health",
  description: "Informes Médicos completos, estandarizados y ordenados, asistidos por Inteligencia Artificial",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "IMI Health",
    statusBarStyle: "default",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SentryErrorBoundary>
            <Suspense>
              <RealtimeNotificationsProvider userId={user?.id ?? null}>
                {children}
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
