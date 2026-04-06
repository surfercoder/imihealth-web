"use client";

import { useCallback, useState } from "react";
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
    return true;
  });

  const handleDone = useCallback(() => {
    setShowWelcome(false);
    // Clean the ?welcome param from the URL only after the welcome screen finishes.
    // Doing this earlier triggers a Next.js router sync that re-renders the server
    // component with showWelcome=false, killing the welcome screen prematurely.
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  return (
    <>
      {children}
      {showWelcome && (
        <WelcomeScreen
          userName={userName}
          onDone={handleDone}
        />
      )}
    </>
  );
}
