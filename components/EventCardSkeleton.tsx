export default function EventCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/8 bg-surface-raised">
      <div className="aspect-[16/9] w-full animate-pulse bg-zinc-800/80" />
      <div className="flex flex-col gap-2.5 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800/80" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800/80" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-800/80" />
        <div className="h-5 w-1/4 animate-pulse rounded-md bg-zinc-800/80" />
      </div>
    </div>
  );
}
