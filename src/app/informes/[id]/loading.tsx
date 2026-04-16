import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="fixed inset-x-0 top-0 z-50 h-14 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 pb-24 pt-20">
        <Skeleton className="mb-6 h-4 w-20" />
        <div className="mb-8">
          <Skeleton className="mb-2 h-7 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-32 w-full rounded-md" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </main>
    </div>
  );
}
