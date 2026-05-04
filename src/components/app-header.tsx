"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { GoodbyeScreen } from "@/components/goodbye-screen";
import { PlanBadge } from "@/components/plan-badge";
import { logout } from "@/actions/auth";
import { useTranslations } from "next-intl";
import { useCurrentTab } from "@/hooks/use-current-tab";
import { getDoctorInitials } from "@/lib/avatar";
import type { PlanInfo } from "@/actions/subscriptions";
import logo from "@/../public/assets/images/imihealth-logo.webp";

interface AppHeaderProps {
  doctorName?: string | null;
  doctorAvatar?: string | null;
  plan?: PlanInfo;
}

function AppHeaderContent({ doctorName, doctorAvatar, plan }: AppHeaderProps) {
  const t = useTranslations();
  const tAvatar = useTranslations("avatarUpload");
  const currentTab = useCurrentTab();
  const initials = getDoctorInitials(doctorName);
  const logoutFormRef = useRef<HTMLFormElement>(null);
  const [showGoodbye, setShowGoodbye] = useState(false);

  const handleLogoutClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    sessionStorage.removeItem("imi_welcomed");
    setShowGoodbye(true);
  };

  const handleGoodbyeDone = () => {
    logoutFormRef.current?.requestSubmit();
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 border-b border-border/60 bg-background/95 backdrop-blur-sm z-50">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link
            href={currentTab ? `/?tab=${currentTab}` : "/"}
            className="flex items-center min-h-11 min-w-[44px] flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            <Image
              src={logo}
              alt={t("alt.logo")}
              width={100}
              priority
              style={{ height: "auto", width: "100px" }}
            />
          </Link>
          <LanguageSwitcher />
          <div className="flex items-center gap-2">
            {doctorName && (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 text-sm text-foreground/60 hover:text-primary hover:underline underline-offset-4 transition-colors"
                >
                  <Avatar className="size-8">
                    {doctorAvatar ? (
                      <AvatarImage src={doctorAvatar} alt={tAvatar("alt")} />
                    ) : null}
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block">
                    {t("nav.greeting", { name: doctorName })}
                  </span>
                </Link>
                {plan ? <PlanBadge plan={plan} /> : null}
              </div>
            )}
            <form ref={logoutFormRef} action={logout}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                onClick={handleLogoutClick}
                disabled={showGoodbye}
              >
                <LogOut className="size-4 mr-1.5" />
                {t("nav.logout")}
              </Button>
            </form>
          </div>
        </div>
      </header>
      {showGoodbye && (
        <GoodbyeScreen userName={doctorName ?? undefined} onDone={handleGoodbyeDone} />
      )}
    </>
  );
}

export function AppHeader(props: AppHeaderProps) {
  return (
    <Suspense fallback={null}>
      <AppHeaderContent {...props} />
    </Suspense>
  );
}
