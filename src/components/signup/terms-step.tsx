"use client";

import { useReducer, useRef, useCallback } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle2, ArrowLeft, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { verifyCaptchaToken } from "@/actions/verify-captcha";
import { TermsContent } from "@/components/signup/terms-content";
import { TermsCaptcha } from "@/components/signup/terms-captcha";
import { termsReducer, termsInitialState } from "@/components/signup/terms-reducer";

interface TermsStepProps {
  onBack: () => void;
  onVerified: (token: string) => void;
  serverError?: string | null;
  isPending: boolean;
}

export function TermsStep({ onBack, onVerified, serverError, isPending }: TermsStepProps) {
  const t = useTranslations("signupTerms");
  const tForm = useTranslations("signupForm");
  const scrollRef = useRef<HTMLDivElement>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [state, dispatch] = useReducer(termsReducer, termsInitialState);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    /* v8 ignore next */
    if (!el || state.hasScrolledToBottom) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) {
      dispatch({ type: "SCROLL_TO_BOTTOM" });
    }
  }, [state.hasScrolledToBottom]);

  const handleConsentChange = (checked: boolean | "indeterminate") => {
    const value = checked === true;
    dispatch({ type: "SET_CONSENT", value });
    /* v8 ignore next */
    if (!value) recaptchaRef.current?.reset();
  };

  const handleContinue = async () => {
    /* v8 ignore next */
    if (!state.captchaToken) return;
    dispatch({ type: "VERIFY_START" });
    let result: Awaited<ReturnType<typeof verifyCaptchaToken>> | null = null;
    try {
      result = await verifyCaptchaToken(state.captchaToken);
    } catch {
      // handled below
    }
    if (result === null) {
      recaptchaRef.current?.reset();
      dispatch({ type: "VERIFY_FAILED", error: t("verifyUnexpectedError") });
      return;
    }
    if (result.success) {
      onVerified(state.captchaToken);
    } else {
      recaptchaRef.current?.reset();
      /* v8 ignore next */
      dispatch({ type: "VERIFY_FAILED", error: result.error ?? t("verifyFailed") });
    }
  };

  const captchaDisplayError =
    state.captchaStatus === "error"
      ? t("captchaError")
      : state.captchaStatus === "expired"
      ? t("captchaExpired")
      : state.captchaError ?? null;

  const canContinue =
    state.consentChecked &&
    state.captchaStatus === "success" &&
    state.captchaToken !== null &&
    !state.isVerifying &&
    !isPending;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
        <ScrollText className="size-4 mt-0.5 shrink-0" />
        <span>{t("description")}</span>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-72 overflow-y-auto rounded-xl border border-border bg-muted/30 px-5 py-4 text-sm text-muted-foreground space-y-5 scroll-smooth"
        >
          <TermsContent />
        </div>
        {!state.hasScrolledToBottom && (
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 rounded-b-xl bg-gradient-to-t from-muted/80 to-transparent"
            aria-hidden
          />
        )}
      </div>

      {!state.hasScrolledToBottom && (
        <p className="text-center text-xs text-muted-foreground">{t("scrollPrompt")}</p>
      )}

      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border p-4 transition-all",
          state.hasScrolledToBottom
            ? "border-emerald-200 bg-emerald-50"
            : "border-border bg-muted/30 opacity-50 select-none"
        )}
      >
        <Checkbox
          id="terms-consent"
          checked={state.consentChecked}
          onCheckedChange={handleConsentChange}
          disabled={!state.hasScrolledToBottom}
          className="mt-0.5"
        />
        <Label
          htmlFor="terms-consent"
          className={cn(
            "text-sm leading-snug",
            state.hasScrolledToBottom ? "cursor-pointer text-foreground" : "cursor-not-allowed text-muted-foreground"
          )}
        >
          {t("acceptLabel")}
        </Label>
      </div>

      {state.consentChecked && (
        <TermsCaptcha
          ref={recaptchaRef}
          status={state.captchaStatus}
          displayError={captchaDisplayError}
          onSuccess={(token) => dispatch({ type: "CAPTCHA_SUCCESS", token })}
          onErrored={() => dispatch({ type: "CAPTCHA_ERROR" })}
          onExpired={() => dispatch({ type: "CAPTCHA_EXPIRE" })}
        />
      )}

      {canContinue && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
          <CheckCircle2 className="size-4" />
          {t("allDone")}
        </div>
      )}

      {serverError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={state.isVerifying || isPending}
          className="sm:flex-1"
        >
          <ArrowLeft className="mr-2 size-4" />
          {t("back")}
        </Button>
        <Button
          type="button"
          disabled={!canContinue}
          onClick={handleContinue}
          className="sm:flex-1"
        >
          {state.isVerifying || isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t("verifying")}
            </>
          ) : (
            tForm("submit")
          )}
        </Button>
      </div>
    </div>
  );
}
