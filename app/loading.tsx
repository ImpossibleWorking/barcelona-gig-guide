import EventCardSkeleton from "@/components/EventCardSkeleton";
import SiteHeader from "@/components/SiteHeader";

// Shown automatically by Next.js while the async HomePage server component
// (and its Supabase query) is still resolving.
export default function Loading() {
  return (
    <main className="min-h-screen bg-brand-gradient">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}
