"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createCheckout, type ProPlanTier } from "@/actions/billing";
import { navigateTo } from "@/lib/navigate";

interface Props {
  plan: ProPlanTier;
  isSignedIn: boolean;
  children: ReactNode;
}

export function ProCheckoutButton({ plan, isSignedIn, children }: Props) {
  const t = useTranslations("pricing");
  const [loading, setLoading] = useState(false);

  if (!isSignedIn) {
    return (
      <Button asChild className="w-full">
        <Link href={`/signup?plan=${plan}`}>{children}</Link>
      </Button>
    );
  }

  async function handleClick() {
    setLoading(true);
    const result = await createCheckout(plan);
    if (result.error || !result.initPoint) {
      toast.error(t("checkoutErrorTitle"), {
        description: result.error ?? t("checkoutErrorGeneric"),
      });
      setLoading(false);
      return;
    }
    navigateTo(result.initPoint);
  }

  return (
    <Button className="w-full" onClick={handleClick} disabled={loading}>
      {loading ? t("checkoutLoading") : children}
    </Button>
  );
}
