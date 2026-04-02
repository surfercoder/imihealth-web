"use client";

import { useEffect, useState } from "react";
import { WelcomeScreen } from "./welcome-screen";

export interface HomeWrapperProps {
  children: React.ReactNode;
  userName?: string;
  showWelcome?: boolean;
}

export function HomeWrapper({ children, userName, showWelcome: initialShowWelcome = false }: HomeWrapperProps) {
  const [showWelcome, setShowWelcome] = useState(() => {
    if (!initialShowWelcome) return false;
    /* v8 ignore next */
    if (typeof window === "undefined") return false;
    if (sessionStorage.getItem("imi_welcomed") === "1") return false;
    sessionStorage.setItem("imi_welcomed", "1");
    return true;
  });

  useEffect(() => {
    if (showWelcome) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [showWelcome]);

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
