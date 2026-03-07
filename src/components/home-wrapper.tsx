"use client";

import { WelcomeOverlay } from "./welcome-overlay";

interface HomeWrapperProps {
  children: React.ReactNode;
  userName?: string;
}

export function HomeWrapper({ children, userName }: HomeWrapperProps) {
  return (
    <>
      {children}
      <WelcomeOverlay userName={userName} />
    </>
  );
}
