"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const RealtimeNotificationsProviderContent = dynamic(
  () =>
    import("@/providers/realtime-notifications-content").then(
      (mod) => mod.RealtimeNotificationsContent
    ),
  { ssr: false }
);

export function RealtimeNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  // Skip loading the Supabase realtime client for unauthenticated visitors
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
