"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe, Check } from "lucide-react";
import { setLocale } from "@/actions/locale";
import { useRouter } from "next/navigation";

const locales = [
  { value: "es", label: "Español", flag: "🇦🇷" },
  { value: "en", label: "English", flag: "🇺🇸" },
] as const;

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSelect(value: string) {
    startTransition(async () => {
      await setLocale(value);
      router.refresh();
    });
  }

  const current = locales.find((l) => l.value === locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-foreground/70 hover:text-foreground"
          disabled={isPending}
          aria-label={t("toggle")}
        >
          <Globe className="size-4" />
          <span className="hidden sm:inline text-xs font-medium">{current?.flag} {current?.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[130px]">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l.value}
            onClick={() => handleSelect(l.value)}
            className="flex items-center justify-between gap-2 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </span>
            {locale === l.value && <Check className="size-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
