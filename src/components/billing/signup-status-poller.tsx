"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "processing" | "ready" | "unknown";

const POLL_INTERVAL_MS = 2000;
const MAX_DURATION_MS = 90_000;

export function SignupStatusPoller({ refId }: { refId: string }) {
  const t = useTranslations("pricing");
  const [state, setState] = useState<State>("processing");
  const [timedOut, setTimedOut] = useState(false);

  // eslint-disable-next-line react-doctor/no-fetch-in-effect, react-doctor/no-cascading-set-state -- the poller intentionally polls server status until it changes
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();

    async function tick() {
      try {
        const res = await fetch(
          `/api/billing/signup-status?ref=${encodeURIComponent(refId)}`,
          { cache: "no-store" },
        );
        const json: { state: State } = await res.json();
        if (cancelled) return;
        setState(json.state);
        if (json.state === "ready" || json.state === "unknown") return;
      } catch {
        // Transient — keep polling until the timeout cap.
      }

      if (Date.now() - startedAt > MAX_DURATION_MS) {
        if (!cancelled) setTimedOut(true);
        return;
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    }

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [refId]);

  return state === "ready" ? (
    <div className="max-w-md text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="size-6" />
      </div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        {t("returnReadyTitle")}
      </h1>
      <p className="mt-3 text-foreground/60">{t("returnReadyDescription")}</p>
      <Button asChild className="mt-8">
        <Link href="/login">{t("returnReadyCta")}</Link>
      </Button>
    </div>
  ) : timedOut || state === "unknown" ? (
    <div className="max-w-md text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("returnTimeoutTitle")}
      </h1>
      <p className="mt-3 text-foreground/60">{t("returnTimeoutDescription")}</p>
      <Button asChild className="mt-8">
        <Link href="/login">{t("returnTimeoutCta")}</Link>
      </Button>
    </div>
  ) : (
    <div className="max-w-md text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Loader2 className="size-6 animate-spin" />
      </div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        {t("returnTitle")}
      </h1>
      <p className="mt-3 text-foreground/60">{t("returnDescription")}</p>
    </div>
  );
}
