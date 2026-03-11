"use client";

import { useState } from "react";
import { WelcomeScreen } from "./welcome-screen";

export function WelcomeOverlay({ userName, showWelcome: initialShowWelcome }: { userName?: string; showWelcome?: boolean }) {
  const [showWelcome, setShowWelcome] = useState(() => {
    const show = initialShowWelcome ?? false;
    if (show && typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
    return show;
  });

  if (!showWelcome) return null;

  return (
    <WelcomeScreen
      userName={userName}
      onDone={() => setShowWelcome(false)}
    />
  );
}
