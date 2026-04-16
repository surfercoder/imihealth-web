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

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-20">
        <Skeleton className="mb-6 h-4 w-20" />
        <div className="mb-8">
          <Skeleton className="mb-2 h-7 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </main>
    </div>
  );
}
