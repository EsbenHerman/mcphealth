import type { ScoreHistoryPoint } from "@/lib/api";

interface ScoreChartProps {
  history: ScoreHistoryPoint[];
}

export function ScoreChart({ history }: ScoreChartProps) {
  if (history.length < 2) {
    return <p className="text-gray-500 text-sm">Not enough data to show a trend yet.</p>;
  }

  const W = 600;
  const H = 200;
  const PAD = { top: 20, right: 20, bottom: 30, left: 40 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const scores = history.map((p) => p.totalScore);
  const times = history.map((p) => new Date(p.scoredAt).getTime());

  const minScore = Math.max(0, Math.min(...scores) - 5);
  const maxScore = Math.min(100, Math.max(...scores) + 5);
  const minTime = times[0];
  const maxTime = times[times.length - 1];
  const timeRange = maxTime - minTime || 1;
  const scoreRange = maxScore - minScore || 1;

  const x = (t: number) => PAD.left + ((t - minTime) / timeRange) * plotW;
  const y = (s: number) => PAD.top + plotH - ((s - minScore) / scoreRange) * plotH;

  const points = history.map((p, i) => `${x(times[i]).toFixed(1)},${y(p.totalScore).toFixed(1)}`);
  const polyline = points.join(" ");

  // Area fill
  const areaPath = `M${x(times[0]).toFixed(1)},${(PAD.top + plotH).toFixed(1)} L${points.join(" L")} L${x(times[times.length - 1]).toFixed(1)},${(PAD.top + plotH).toFixed(1)} Z`;

  // Y-axis labels
  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const val = minScore + (scoreRange * i) / yTicks;
    return { val: Math.round(val), py: y(val) };
  });

  // X-axis labels (up to 5)
  const xCount = Math.min(5, history.length);
  const xLabels = Array.from({ length: xCount }, (_, i) => {
    const idx = Math.round((i / (xCount - 1)) * (history.length - 1));
    const d = new Date(history[idx].scoredAt);
    return {
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      px: x(times[idx]),
    };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {yLabels.map((yl, i) => (
        <line key={i} x1={PAD.left} y1={yl.py} x2={W - PAD.right} y2={yl.py} stroke="#374151" strokeWidth="0.5" />
      ))}

      {/* Area */}
      <path d={areaPath} fill="url(#scoreGradient)" />
      <defs>
        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Line */}
      <polyline points={polyline} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" />

      {/* Dots on line (only if few points) */}
      {history.length <= 30 && history.map((p, i) => (
        <circle key={i} cx={x(times[i])} cy={y(p.totalScore)} r="3" fill="#22c55e" stroke="#111827" strokeWidth="1.5" />
      ))}

      {/* Y labels */}
      {yLabels.map((yl, i) => (
        <text key={i} x={PAD.left - 6} y={yl.py + 4} textAnchor="end" fill="#6b7280" fontSize="10">
          {yl.val}
        </text>
      ))}

      {/* X labels */}
      {xLabels.map((xl, i) => (
        <text key={i} x={xl.px} y={H - 6} textAnchor="middle" fill="#6b7280" fontSize="10">
          {xl.label}
        </text>
      ))}
    </svg>
  );
}
