"use client";

import { createContext, useContext } from "react";
import type { PlanInfo } from "@/actions/plan";

const PlanContext = createContext<PlanInfo | null>(null);

export function PlanProvider({
  plan,
  children,
}: {
  plan: PlanInfo;
  children: React.ReactNode;
}) {
  return <PlanContext.Provider value={plan}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanInfo {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    throw new Error("usePlan must be used within a PlanProvider");
  }
  return ctx;
}
