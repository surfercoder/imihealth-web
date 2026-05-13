"use client";

import { useSearchParams } from "next/navigation";

export function useCurrentTab() {
  // eslint-disable-next-line react-doctor/nextjs-no-use-search-params-without-suspense -- callers render inside client-component subtrees that have already crossed their nearest Suspense boundary
  const searchParams = useSearchParams();
  return searchParams.get("tab");
}
