"use client";

import { createClient } from "@/utils/supabase/client";
import { usePathname, useRouter, useSearchParams as useNextSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { RealtimeChannel } from "@supabase/supabase-js";

function RealtimeNotificationsContentInner({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string;
}) {
  const nav = useRouter();
  const pathname = usePathname();
  const searchParams = useNextSearchParams();
  const t = useTranslations("notifications");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const quickChannelRef = useRef<RealtimeChannel | null>(null);
  const shownNotificationsRef = useRef<Set<string>>(new Set());

  const prevPathnameRef = useRef(pathname);

  // Request browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const showBrowserNotification = useCallback(
    (title: string, body: string, url: string) => {
      if (
        !document.hidden ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
      ) {
        return;
      }

      const notification = new Notification(title, {
        body,
        icon: "/icon.png",
      });

      notification.onclick = () => {
        window.focus();
        nav.push(url);
        notification.close();
      };
    },
    [nav]
  );

  // Dismiss all toasts when navigating *away* from an informe detail page
  // so persistent notifications don't stack and block UI on other pages.
  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    if (prev === pathname) return;

    const isInformePage = /^\/informes\/[^/]+$/.test(prev);
    const isQuickInformePage = /^\/informes-rapidos\/[^/]+$/.test(prev);

    if (isInformePage || isQuickInformePage) {
      toast.dismiss();
    }
  }, [pathname]);

  useEffect(() => {
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
            const informUrl = currentTab ? `/informes/${newData.id}?tab=${currentTab}` : `/informes/${newData.id}`;

            toast.success(t("newReportTitle"), {
              description: t("newReportDescription", { patientName }),
              action: {
                label: t("viewReport"),
                onClick: () => {
                  nav.push(informUrl);
                },
              },
              duration: Infinity,
              closeButton: true,
            });

            showBrowserNotification(
              t("newReportTitle"),
              t("newReportDescription", { patientName }),
              informUrl
            );
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Mirror the same notification flow for quick reports. They live in a
    // separate table (`informes_rapidos`) so they need their own subscription.
    const quickChannel = supabase
      .channel(`doctor-notifications-quick:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "informes_rapidos",
          filter: `doctor_id=eq.${userId}`,
        },
        (payload) => {
          const oldData = payload.old as {
            id: string;
            status: string;
          } | null;

          const newData = payload.new as {
            id: string;
            status: string;
          };

          if (
            newData.status === "completed" &&
            oldData?.status !== "completed"
          ) {
            if (shownNotificationsRef.current.has(newData.id)) {
              return;
            }

            shownNotificationsRef.current.add(newData.id);

            const quickUrl = `/informes-rapidos/${newData.id}`;

            toast.success(t("newQuickReportTitle"), {
              description: t("newQuickReportDescription"),
              action: {
                label: t("viewReport"),
                onClick: () => {
                  nav.push(quickUrl);
                },
              },
              duration: Infinity,
              closeButton: true,
            });

            showBrowserNotification(
              t("newQuickReportTitle"),
              t("newQuickReportDescription"),
              quickUrl
            );
          }
        },
      )
      .subscribe();

    quickChannelRef.current = quickChannel;

    // When the tab regains focus, re-subscribe channels in case the
    // WebSocket connection went stale while the browser throttled timers
    // (common on Edge and mobile browsers).
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        channelRef.current?.subscribe();
        quickChannelRef.current?.subscribe();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (quickChannelRef.current) {
        supabase.removeChannel(quickChannelRef.current);
      }
    };
  }, [userId, nav, t, searchParams, showBrowserNotification]);

  return <>{children}</>;
}

export function RealtimeNotificationsContent({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string;
}) {
  return (
    <Suspense>
      <RealtimeNotificationsContentInner userId={userId}>
        {children}
      </RealtimeNotificationsContentInner>
    </Suspense>
  );
}
