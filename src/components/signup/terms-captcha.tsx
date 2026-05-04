"use client";

import ReCAPTCHA from "react-google-recaptcha";
import { useTranslations } from "next-intl";
import { CheckCircle2, ShieldCheck } from "lucide-react";

interface TermsCaptchaProps {
  ref?: React.Ref<ReCAPTCHA>;
  status: "idle" | "success" | "error" | "expired";
  displayError: string | null;
  onSuccess: (token: string) => void;
  onErrored: () => void;
  onExpired: () => void;
}

export function TermsCaptcha({
  ref,
  status,
  displayError,
  onSuccess,
  onErrored,
  onExpired,
}: TermsCaptchaProps) {
  const t = useTranslations("signupTerms");
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
        <p className="text-sm font-medium">{t("captchaTitle")}</p>
      </div>
      <p className="text-xs text-muted-foreground">{t("captchaSubtitle")}</p>
      <div className="flex items-center justify-start">
        <ReCAPTCHA
          ref={ref}
          sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
          onChange={(token) => {
            if (token) onSuccess(token);
          }}
          onErrored={onErrored}
          onExpired={onExpired}
        />
      </div>
      {displayError && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <span>⚠</span> {displayError}
        </p>
      )}
      {status === "success" && !displayError && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
          <CheckCircle2 className="size-3.5" />
          {t("captchaVerified")}
        </div>
      )}
    </div>
  );
}
