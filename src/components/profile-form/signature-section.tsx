"use client";

import type { UseFormReturn } from "react-hook-form";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { SignatureField } from "@/components/signature-field";
import { useTranslations } from "next-intl";
import type { ProfileFormValues } from "./schema";

interface SignatureSectionProps {
  form: UseFormReturn<ProfileFormValues>;
  firmaDigital: string | null;
  signatureChanged: boolean;
  onSignatureChanged: () => void;
}

export function SignatureSection({
  form,
  firmaDigital,
  signatureChanged,
  onSignatureChanged,
}: SignatureSectionProps) {
  const t = useTranslations("profilePage");

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">
        {t("signatureSection")}
      </h3>
      {firmaDigital && !signatureChanged && (
        <div className="mb-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            {t("currentSignature")}
          </p>
          <div className="overflow-hidden rounded-md border border-border bg-white p-2">
            <Image
              src={firmaDigital}
              alt={t("signatureAlt")}
              width={300}
              height={100}
              className="h-auto max-h-24 w-auto"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSignatureChanged}
          >
            {t("changeSignature")}
          </Button>
        </div>
      )}
      {(!firmaDigital || signatureChanged) && (
        <FormField
          control={form.control}
          name="firmaDigital"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormControl>
                <SignatureField
                  onChange={(dataUrl) => {
                    field.onChange(dataUrl);
                    onSignatureChanged();
                  }}
                  /* v8 ignore next */
                  error={fieldState.error?.message}
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
