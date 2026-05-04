"use client";

import { useRef, useState } from "react";
import { Camera, Trash2, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AVATAR_MAX_FILE_BYTES,
  fileToCompressedDataUrl,
  getDoctorInitials,
} from "@/lib/avatar";

interface AvatarUploadProps {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  initialsSource?: string | null;
  disabled?: boolean;
  error?: string;
}

export function AvatarUpload({
  value,
  onChange,
  initialsSource,
  disabled,
  error,
}: AvatarUploadProps) {
  const t = useTranslations("avatarUpload");
  const inputRef = useRef<HTMLInputElement | null>(null);
  // eslint-disable-next-line react-doctor/rerender-state-only-in-handlers -- read transitively via `message`
  const [localError, setLocalError] = useState<string | null>(null);

  const hasImage = Boolean(value);
  const initials = getDoctorInitials(initialsSource);

  async function handleFile(file: File) {
    setLocalError(null);
    if (!file.type.startsWith("image/")) {
      setLocalError(t("invalidType"));
      return;
    }
    if (file.size > AVATAR_MAX_FILE_BYTES) {
      setLocalError(t("tooLarge"));
      return;
    }
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      onChange(dataUrl);
    } catch {
      setLocalError(t("processingFailed"));
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    /* v8 ignore next */
    if (!file) return;
    void handleFile(file);
    e.target.value = "";
  }

  function handleRemove() {
    setLocalError(null);
    onChange(null);
  }

  function openPicker() {
    inputRef.current?.click();
  }

  const message = error ?? localError;

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-20 border border-border bg-muted">
        {hasImage && value ? (
          <AvatarImage src={value} alt={t("alt")} />
        ) : null}
        <AvatarFallback>
          {initials ? (
            <span className="text-base">{initials}</span>
          ) : (
            <User className="size-8" />
          )}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={openPicker}
          >
            <Camera className="mr-1.5 size-4" />
            {hasImage ? t("change") : t("upload")}
          </Button>
          {hasImage && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={handleRemove}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="mr-1.5 size-4" />
              {t("remove")}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t("hint")}</p>
        {message && (
          <p className="text-sm font-medium text-destructive">{message}</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileInputChange}
        disabled={disabled}
      />
    </div>
  );
}
