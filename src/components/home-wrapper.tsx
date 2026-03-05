"use client";

import { Suspense } from "react";
import { WelcomeOverlay } from "./welcome-overlay";

interface HomeWrapperProps {
  children: React.ReactNode;
  userName?: string;
}

export function HomeWrapper({ children, userName }: HomeWrapperProps) {
  return (
    <>
      {children}
      <Suspense>
        <WelcomeOverlay userName={userName} />
      </Suspense>
    </>
  );
}
