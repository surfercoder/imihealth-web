"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const RealtimeNotificationsProviderContent = dynamic(
  () =>
    import("@/providers/realtime-notifications-content").then(
      (mod) => mod.RealtimeNotificationsContent
    ),
  { ssr: false }
);

export function RealtimeNotificationsProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string | null;
}) {
  // Skip loading the Supabase realtime client entirely for unauthenticated visitors
  if (!userId) {
    return <>{children}</>;
  }

  return (
    <Suspense>
      <RealtimeNotificationsProviderContent userId={userId}>
        {children}
      </RealtimeNotificationsProviderContent>
    </Suspense>
  );
}
