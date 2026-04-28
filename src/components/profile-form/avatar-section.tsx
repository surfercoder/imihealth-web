"use client";

import type { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { ImageIcon } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { AvatarUpload } from "@/components/avatar-upload";
import type { ProfileFormValues } from "./schema";

interface AvatarSectionProps {
  form: UseFormReturn<ProfileFormValues>;
  onAvatarChanged: () => void;
}

export function AvatarSection({ form, onAvatarChanged }: AvatarSectionProps) {
  const t = useTranslations("profilePage");
  const nameValue = form.watch("name");

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <ImageIcon className="size-4" />
        {t("avatarSection")}
      </h3>
      <FormField
        control={form.control}
        name="avatar"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormControl>
              <AvatarUpload
                value={field.value ?? null}
                onChange={(dataUrl) => {
                  field.onChange(dataUrl ?? "");
                  onAvatarChanged();
                }}
                initialsSource={nameValue}
                /* v8 ignore next */
                error={fieldState.error?.message}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
