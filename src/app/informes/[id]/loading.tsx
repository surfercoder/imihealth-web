import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl flex-1 px-6 pb-24 pt-6">
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
  );
}
