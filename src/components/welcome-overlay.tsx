"use client";

import { useState } from "react";
import { WelcomeScreen } from "./welcome-screen";

export function WelcomeOverlay({ userName }: { userName?: string }) {
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "true") {
      window.history.replaceState(null, "", "/");
      return true;
    }
    return false;
  });

  if (!showWelcome) return null;

  return (
    <WelcomeScreen
      userName={userName}
      onDone={() => setShowWelcome(false)}
    />
  );
}
