"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { RealtimeChannel } from "@supabase/supabase-js";

function RealtimeNotificationsProviderContent({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("notifications");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const shownNotificationsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`doctor-notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "informes",
          filter: `doctor_id=eq.${userId}`,
        },
        async (payload) => {
          const oldData = payload.old as {
            id: string;
            status: string;
            patient_id: string;
          } | null;
          
          const newData = payload.new as {
            id: string;
            status: string;
            patient_id: string;
          };

          // Only show notification if status changed TO completed (not already completed)
          if (newData.status === "completed" && oldData?.status !== "completed") {
            if (shownNotificationsRef.current.has(newData.id)) {
              return;
            }

            shownNotificationsRef.current.add(newData.id);

            const { data: patientData } = await supabase
              .from("patients")
              .select("name")
              .eq("id", newData.patient_id)
              .single();

            const patientName = patientData?.name || t("unknownPatient");

            const currentTab = searchParams.get("tab");
            toast.success(t("newReportTitle"), {
              description: t("newReportDescription", { patientName }),
              action: {
                label: t("viewReport"),
                onClick: () => {
                  const url = currentTab ? `/informes/${newData.id}?tab=${currentTab}` : `/informes/${newData.id}`;
                  router.push(url);
                },
              },
              duration: 10000,
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, router, t, searchParams]);

  return <>{children}</>;
}

export function RealtimeNotificationsProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string | null;
}) {
  return (
    <Suspense>
      <RealtimeNotificationsProviderContent userId={userId}>
        {children}
      </RealtimeNotificationsProviderContent>
    </Suspense>
  );
}
