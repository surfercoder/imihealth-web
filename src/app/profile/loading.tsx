import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl flex-1 px-6 pb-24 pt-6">
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
  );
}
