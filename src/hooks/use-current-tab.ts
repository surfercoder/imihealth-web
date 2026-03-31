"use client";

import { useSearchParams } from "next/navigation";

export function useCurrentTab() {
  const searchParams = useSearchParams();
  return searchParams.get("tab");
}
