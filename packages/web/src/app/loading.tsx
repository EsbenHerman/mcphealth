export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Hero skeleton */}
      <div className="space-y-3">
        <div className="h-10 w-96 max-w-full rounded-lg bg-gray-800/50" />
        <div className="h-5 w-72 max-w-full rounded-lg bg-gray-800/30" />
      </div>

      {/* Stats skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 space-y-2">
            <div className="h-4 w-20 rounded bg-gray-800/50" />
            <div className="h-7 w-16 rounded bg-gray-800/50" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <div className="bg-gray-900/80 px-4 py-3 h-10" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-t border-gray-800/50">
            <div className="h-3 w-3 rounded-full bg-gray-800/50" />
            <div className="h-4 w-48 rounded bg-gray-800/50" />
            <div className="h-4 w-16 rounded bg-gray-800/50 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
