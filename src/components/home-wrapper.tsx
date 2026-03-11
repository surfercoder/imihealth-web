"use client";

import { useState } from "react";
import { WelcomeScreen } from "./welcome-screen";

export interface HomeWrapperProps {
  children: React.ReactNode;
  userName?: string;
  showWelcome?: boolean;
}

export function HomeWrapper({ children, userName, showWelcome: initialShowWelcome = false }: HomeWrapperProps) {
  const [showWelcome, setShowWelcome] = useState(initialShowWelcome);

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
