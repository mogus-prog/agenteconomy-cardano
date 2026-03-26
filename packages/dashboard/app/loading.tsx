import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 bg-white/[0.06]" />
        <Skeleton className="h-4 w-96 bg-white/[0.04]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass rounded-xl p-5 space-y-3">
            <Skeleton className="h-5 w-24 bg-white/[0.06]" />
            <Skeleton className="h-5 w-full bg-white/[0.06]" />
            <Skeleton className="h-4 w-3/4 bg-white/[0.04]" />
            <Skeleton className="h-8 w-28 bg-white/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  );
}
