"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { WelcomeScreen } from "./welcome-screen";

interface HomeWrapperProps {
  children: React.ReactNode;
  userName?: string;
}

export function HomeWrapper({ children, userName }: HomeWrapperProps) {
  const searchParams = useSearchParams();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (searchParams.get("welcome") === "true") {
      setShowWelcome(true);
      window.history.replaceState(null, "", "/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
