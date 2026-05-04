import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getTranslations } from "next-intl/server";
import logo from "@/../public/assets/images/imihealth-logo.webp";
import imiBotFront from "@/../public/assets/images/imi-bot-look-front-transparent.webp";

interface PublicHeaderProps {
  useBotIcon?: boolean;
}

export async function PublicHeader({ useBotIcon = false }: PublicHeaderProps = {}) {
  const [t, tAlt] = await Promise.all([
    getTranslations("nav"),
    getTranslations("alt"),
  ]);

  return (
    <header className="fixed top-0 left-0 right-0 border-b border-border/60 bg-background/95 backdrop-blur-sm z-50">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center min-h-11 min-w-[44px] flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          {useBotIcon ? (
            <Image
              src={imiBotFront}
              alt={tAlt("botFront")}
              width={44}
              height={44}
              priority
              className="h-10 w-10 sm:h-11 sm:w-11 drop-shadow-sm"
            />
          ) : (
            <Image
              src={logo}
              alt={tAlt("logo")}
              width={100}
              priority
              className="h-auto w-[72px] sm:w-[100px]"
            />
          )}
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex px-2 sm:px-3" asChild>
            <Link href="/pricing">{t("pricing")}</Link>
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex px-2 sm:px-3" asChild>
            <Link href="/manifest">{t("manifest")}</Link>
          </Button>
          <Button variant="ghost" size="sm" className="px-2 sm:px-3" asChild>
            <Link href="/login">{t("signIn")}</Link>
          </Button>
          <Button size="sm" className="px-2.5 sm:px-3" asChild>
            <Link href="/pricing">{t("signUp")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
