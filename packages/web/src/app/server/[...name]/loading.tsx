export default function ServerLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-4 w-32 rounded bg-gray-800/50" />

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-gray-800/50" />
          <div className="h-8 w-64 rounded-lg bg-gray-800/50" />
          <div className="h-6 w-12 rounded-full bg-gray-800/50" />
        </div>
        <div className="h-5 w-96 max-w-full rounded bg-gray-800/30" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-4">
            <div className="h-5 w-40 rounded bg-gray-800/50" />
            {[...Array(4)].map((_, j) => (
              <div key={j} className="space-y-1">
                <div className="h-4 w-full rounded bg-gray-800/30" />
                <div className="h-2 w-full rounded-full bg-gray-800/50" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
