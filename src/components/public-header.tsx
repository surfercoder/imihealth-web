import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getTranslations } from "next-intl/server";

export async function PublicHeader() {
  const t = await getTranslations("nav");

  return (
    <header className="fixed top-0 left-0 right-0 border-b border-border/60 bg-background/95 backdrop-blur-sm z-50">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-foreground hover:opacity-80 transition-opacity"
        >
          IMI Health
        </Link>
        <LanguageSwitcher />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">{t("signIn")}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">{t("signUp")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
