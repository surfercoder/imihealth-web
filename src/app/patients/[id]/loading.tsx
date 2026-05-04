import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl flex-1 px-6 pb-24 pt-6">
      <Skeleton className="mb-6 h-4 w-20" />
      <div className="mb-8 flex items-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <div>
          <Skeleton className="mb-2 h-6 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5">
            <Skeleton className="mb-3 h-4 w-3/4" />
            <Skeleton className="mb-2 h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </main>
  );
}
