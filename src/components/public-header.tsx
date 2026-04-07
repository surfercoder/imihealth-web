import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getTranslations } from "next-intl/server";
import logo from "@/../public/assets/images/imihealth-logo.webp";

export async function PublicHeader() {
  const t = await getTranslations("nav");

  return (
    <header className="fixed top-0 left-0 right-0 border-b border-border/60 bg-background/95 backdrop-blur-sm z-50">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center min-h-11 hover:opacity-80 transition-opacity"
        >
          <Image
            src={logo}
            alt="IMI Health"
            width={100}
            priority
            style={{ height: "auto", width: "100px" }}
          />
        </Link>
        <LanguageSwitcher />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/manifest">{t("manifest")}</Link>
          </Button>
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
