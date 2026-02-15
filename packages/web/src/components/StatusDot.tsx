export function StatusDot({ status, showLabel }: { status: string; showLabel?: boolean }) {
  const isLocal = status === "local" || status === "unknown";
  const cls =
    status === "up" ? "bg-green-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" :
    status === "down" ? "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]" :
    status === "degraded" ? "bg-yellow-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" :
    isLocal ? "bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.6)]" :
              "bg-gray-500";

  const label = status === "up" ? "Up" : status === "down" ? "Down" : status === "degraded" ? "Degraded" : isLocal ? "Local only" : status;

  if (showLabel && isLocal) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
        <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />
        Local only
      </span>
    );
  }

  if (showLabel) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />
        <span className="text-xs text-gray-400">{label}</span>
      </span>
    );
  }

  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}
