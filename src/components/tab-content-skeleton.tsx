import { Skeleton } from "@/components/ui/skeleton";

export function TabContentSkeleton({
  variant,
}: {
  variant: "patients" | "dashboard";
}) {
  if (variant === "dashboard") {
    return (
      <div className="space-y-6">
        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5">
              <Skeleton className="mb-2 h-4 w-20" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>
        {/* Chart placeholders */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-card p-5">
            <Skeleton className="mb-4 h-4 w-32" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="rounded-xl border bg-card p-5">
            <Skeleton className="mb-4 h-4 w-32" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Patients variant
  return (
    <div className="space-y-4">
      {/* Search bar */}
      <Skeleton className="h-10 w-full rounded-md" />
      {/* Patient cards */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-5">
          <Skeleton className="mb-3 h-4 w-3/4" />
          <Skeleton className="mb-2 h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
