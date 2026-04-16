import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background pt-14">
      {/* Header skeleton */}
      <div className="fixed inset-x-0 top-0 z-50 h-14 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {/* Welcome area */}
        <div className="mb-8">
          <Skeleton className="mb-2 h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* Tabs skeleton */}
        <div className="mb-6 flex gap-4">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>

        {/* Content cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5">
              <Skeleton className="mb-3 h-4 w-3/4" />
              <Skeleton className="mb-2 h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
