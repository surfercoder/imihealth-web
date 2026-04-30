"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type SignupSuccessProps =
  | { paymentUrl: string }
  | { paymentUrl?: undefined };

export function SignupSuccess(props: SignupSuccessProps = {}) {
  const t = useTranslations("signupForm");
  const paymentUrl = props.paymentUrl;

  if (paymentUrl) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="size-6 animate-spin" />
          </div>
          <div>
            <p className="font-semibold">{t("redirectingTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("redirectingMessage")}
            </p>
          </div>
          <a
            href={paymentUrl}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            {t("continueToPayment")}
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-6" />
        </div>
        <div>
          <p className="font-semibold">{t("successTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("successMessage")}</p>
        </div>
        <Link
          href="/login"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </CardContent>
    </Card>
  );
}
