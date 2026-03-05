"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { WelcomeScreen } from "./welcome-screen";

export function WelcomeOverlay({ userName }: { userName?: string }) {
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "true";
  const [showWelcome, setShowWelcome] = useState(() => {
    if (isWelcome && typeof window !== "undefined") {
      window.history.replaceState(null, "", "/");
    }
    return isWelcome;
  });

  if (!showWelcome) return null;

  return (
    <WelcomeScreen
      userName={userName}
      onDone={() => setShowWelcome(false)}
    />
  );
}
