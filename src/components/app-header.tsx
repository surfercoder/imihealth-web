import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { logout } from "@/actions/auth";
import { getTranslations } from "next-intl/server";

interface AppHeaderProps {
  doctorName?: string | null;
}

export async function AppHeader({ doctorName }: AppHeaderProps) {
  const t = await getTranslations();

  return (
    <header className="fixed top-0 left-0 right-0 border-b border-border/60 bg-background/95 backdrop-blur-sm z-50">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link
          href="/dashboard"
          className="text-lg font-bold tracking-tight text-foreground hover:opacity-80 transition-opacity"
        >
          IMI Health
        </Link>
        <LanguageSwitcher />
        <div className="flex items-center gap-2">
          {doctorName && (
            <span className="text-sm text-foreground/60 hidden sm:block">
              {t("nav.greeting", { name: doctorName })}
            </span>
          )}
          <form action={logout}>
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
