"use client";

import { Suspense } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { logout } from "@/actions/auth";
import { useTranslations } from "next-intl";
import { useCurrentTab } from "@/hooks/use-current-tab";

interface AppHeaderProps {
  doctorName?: string | null;
}

function AppHeaderContent({ doctorName }: AppHeaderProps) {
  const t = useTranslations();
  const currentTab = useCurrentTab();

  return (
    <header className="fixed top-0 left-0 right-0 border-b border-border/60 bg-background/95 backdrop-blur-sm z-50">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link
          href={currentTab ? `/?tab=${currentTab}` : "/"}
          className="text-lg font-bold tracking-tight text-foreground hover:opacity-80 transition-opacity"
        >
          IMI Health
        </Link>
        <LanguageSwitcher />
        <div className="flex items-center gap-2">
          {doctorName && (
            <Link
              href="/profile"
              className="text-sm text-foreground/60 hidden sm:block hover:text-primary hover:underline underline-offset-4 transition-colors"
            >
              {t("nav.greeting", { name: doctorName })}
            </Link>
          )}
          <form
            action={logout}
            onSubmit={() => {
              sessionStorage.removeItem("imi_welcomed");
            }}
          >
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="size-4 mr-1.5" />
              {t("nav.logout")}
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function AppHeader(props: AppHeaderProps) {
  return (
    <Suspense fallback={null}>
      <AppHeaderContent {...props} />
    </Suspense>
  );
}
