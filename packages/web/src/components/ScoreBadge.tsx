export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-500">N/A</span>;
  const s = Math.round(score);
  const cls =
    s >= 90 ? "bg-green-500/15 text-green-400 ring-green-500/30" :
    s >= 70 ? "bg-yellow-400/15 text-yellow-400 ring-yellow-400/30" :
    s >= 50 ? "bg-orange-400/15 text-orange-400 ring-orange-400/30" :
              "bg-red-400/15 text-red-400 ring-red-400/30";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}>
      {s}
    </span>
  );
}
