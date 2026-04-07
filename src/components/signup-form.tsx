"use client";

import { useState, useActionState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signup } from "@/actions/auth";
import { SignupSuccess } from "@/components/signup/signup-success";
import { TermsStep } from "@/components/signup/terms-step";
import {
  RegistrationStep,
  type ClientSignupFormValues,
} from "@/components/signup/registration-step";

export function SignupForm() {
  const tTerms = useTranslations("signupTerms");
  const [state, formAction] = useActionState(signup, null);
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2>(1);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  function onStep1Submit(values: ClientSignupFormValues) {
    const formData = new FormData();
    /* v8 ignore next */
    formData.set("name", values.name ?? "");
    formData.set("email", values.email);
    formData.set("password", values.password);
    formData.set("confirmPassword", values.confirmPassword);
    /* v8 ignore next */
    formData.set("dni", values.dni ?? "");
    formData.set("matricula", values.matricula);
    formData.set("phone", values.phone.e164);
    formData.set("especialidad", values.especialidad);
    /* v8 ignore next */
    formData.set("firmaDigital", values.firmaDigital ?? "");
    setPendingFormData(formData);
    setStep(2);
  }

  function onCaptchaVerified() {
    /* v8 ignore next */
    if (!pendingFormData) return;
    startTransition(() => formAction(pendingFormData));
  }

  if (state?.success) {
    return <SignupSuccess />;
  }

  if (step === 2) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {tTerms("stepBadge")}
            </span>
          </div>
          <CardTitle className="text-xl">{tTerms("title")}</CardTitle>
          <CardDescription>{tTerms("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <TermsStep
            onBack={() => setStep(1)}
            onVerified={onCaptchaVerified}
            serverError={state?.error}
            isPending={isPending}
          />
        </CardContent>
      </Card>
    );
  }

  return <RegistrationStep onSubmit={onStep1Submit} isPending={isPending} />;
}
