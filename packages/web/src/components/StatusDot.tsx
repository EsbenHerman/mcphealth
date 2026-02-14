export function StatusDot({ status }: { status: string }) {
  const cls =
    status === "up" ? "bg-green-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" :
    status === "down" ? "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]" :
    status === "degraded" ? "bg-yellow-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" :
    status === "local" ? "bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.6)]" :
                            "bg-gray-500";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}
