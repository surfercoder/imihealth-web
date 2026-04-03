"use client";

import { useState } from "react";
import { WelcomeScreen } from "./welcome-screen";

interface HomeWrapperProps {
  children: React.ReactNode;
  userName?: string;
  showWelcome?: boolean;
}

export function HomeWrapper({ children, userName, showWelcome: initialShowWelcome = false }: HomeWrapperProps) {
  const [showWelcome, setShowWelcome] = useState(() => {
    if (!initialShowWelcome) return false;
    /* v8 ignore next */
    if (typeof window === "undefined") return false;
    const shownAt = sessionStorage.getItem("imi_welcomed");
    if (shownAt && Date.now() - Number(shownAt) > 3000) return false;
    if (!shownAt) sessionStorage.setItem("imi_welcomed", String(Date.now()));
    window.history.replaceState(null, "", window.location.pathname);
    return true;
  });

  return (
    <>
      {children}
      {showWelcome && (
        <WelcomeScreen
          userName={userName}
          onDone={() => setShowWelcome(false)}
        />
      )}
    </>
  );
}
