"use client";

import { useState } from "react";
import { WelcomeScreen } from "./welcome-screen";

export interface HomeWrapperProps {
  children: React.ReactNode;
  userName?: string;
  showWelcome?: boolean;
}

export function HomeWrapper({ children, userName, showWelcome: initialShowWelcome = false }: HomeWrapperProps) {
  const [showWelcome, setShowWelcome] = useState(() => {
    if (!initialShowWelcome) return false;
    if (typeof window === "undefined") return false;
    if (sessionStorage.getItem("imi_welcomed") === "1") return false;
    sessionStorage.setItem("imi_welcomed", "1");
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
