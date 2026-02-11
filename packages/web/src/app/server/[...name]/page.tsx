import Link from "next/link";
import { getServer, getServerScore, getServerChecks, ScoreBreakdown } from "@/lib/api";
import { ScoreBadge } from "@/components/ScoreBadge";
import { StatusDot } from "@/components/StatusDot";

export const dynamic = "force-dynamic";

function ProgressBar({ label, value, weight }: { label: string; value: number | null; weight: string }) {
  const v = value ?? 0;
  const color =
    v >= 80 ? "bg-green-400" :
    v >= 60 ? "bg-yellow-400" :
    v >= 40 ? "bg-orange-400" :
              "bg-red-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="text-gray-500 text-xs">{weight} · <span className="text-gray-300 font-medium">{value !== null ? Math.round(v) : "—"}</span></span>
      </div>
      <div className="h-2 rounded-full bg-gray-800">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${Math.min(v, 100)}%` }} />
      </div>
    </div>
  );
}

function StatusTimeline({ checks }: { checks: any[] }) {
  // Show last 24 blocks from recent checks
  const blocks = checks.slice(0, 48).reverse();
  if (blocks.length === 0) return <p className="text-gray-500 text-sm">No status history available.</p>;
  return (
    <div className="flex gap-0.5 flex-wrap">
      {blocks.map((c: any, i: number) => {
        const cls =
          c.status === "up" ? "bg-green-400/80" :
          c.status === "degraded" ? "bg-yellow-400/80" :
          c.status === "down" ? "bg-red-400/80" :
                                "bg-gray-700";
        return (
          <div
            key={i}
            className={`h-6 w-2 rounded-sm ${cls}`}
            title={`${c.status} — ${new Date(c.checkedAt).toLocaleString()}`}
          />
        );
      })}
    </div>
  );
}

export default async function ServerDetailPage({ params }: { params: Promise<{ name: string[] }> }) {
  const { name: nameParts } = await params;
  const serverName = nameParts.join("/");

  let server: any = null;
  let score: ScoreBreakdown | null = null;
  let checks: any[] = [];
  let error = false;

  try {
    [server, score, { checks }] = await Promise.all([
      getServer(serverName),
      getServerScore(serverName).catch(() => null),
      getServerChecks(serverName, { limit: "48" }).catch(() => ({ checks: [] })),
    ]) as any;
  } catch {
    error = true;
  }

  if (error || !server) {
    return (
      <div className="space-y-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-green-400 transition-colors">
          ← Back to dashboard
        </Link>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-gray-400">
          <p className="text-lg font-medium">Server not found</p>
          <p className="mt-1 text-sm">Could not load details for &quot;{serverName}&quot;</p>
        </div>
      </div>
    );
  }

  const factors = [
    { label: "Availability", key: "availability" as const, weight: "25%" },
    { label: "Latency", key: "latency" as const, weight: "20%" },
    { label: "Schema Stability", key: "schemaStability" as const, weight: "15%" },
    { label: "Protocol Compliance", key: "protocolCompliance" as const, weight: "15%" },
    { label: "Metadata Quality", key: "metadataQuality" as const, weight: "15%" },
    { label: "Freshness", key: "freshness" as const, weight: "10%" },
  ];

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-green-400 transition-colors">
        ← Back to dashboard
      </Link>

      {/* Header */}
      <section className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <StatusDot status={server.currentStatus} />
          <h1 className="text-3xl font-bold tracking-tight">{server.title || server.registryName}</h1>
          <ScoreBadge score={server.trustScore} />
        </div>
        {server.description && <p className="text-gray-400 max-w-2xl">{server.description}</p>}

        {/* Metadata pills */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-gray-800 px-2.5 py-1 text-gray-400">{server.transportType}</span>
          {server.version && <span className="rounded-md bg-gray-800 px-2.5 py-1 text-gray-400">v{server.version}</span>}
          {server.repoUrl && (
            <a href={server.repoUrl} target="_blank" rel="noopener" className="rounded-md bg-gray-800 px-2.5 py-1 text-gray-400 hover:text-green-400 transition-colors">
              Repository ↗
            </a>
          )}
          {server.websiteUrl && (
            <a href={server.websiteUrl} target="_blank" rel="noopener" className="rounded-md bg-gray-800 px-2.5 py-1 text-gray-400 hover:text-green-400 transition-colors">
              Website ↗
            </a>
          )}
        </div>
      </section>

      {/* Two-column: Score breakdown + Status history */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trust Score Breakdown */}
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Trust Score Breakdown</h2>
          {score ? (
            <div className="space-y-3">
              {factors.map((f) => (
                <ProgressBar key={f.key} label={f.label} value={score[f.key]} weight={f.weight} />
              ))}
              <div className="pt-2 border-t border-gray-800 flex justify-between">
                <span className="text-gray-300 font-medium">Total Score</span>
                <span className="text-xl font-bold text-gray-100">{Math.round(score.totalScore)}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No score data available yet.</p>
          )}
        </section>

        {/* Status History */}
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Status History (Last 24h)</h2>
          <StatusTimeline checks={checks} />
          <div className="flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-400/80" /> Up</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-yellow-400/80" /> Degraded</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400/80" /> Down</span>
          </div>
        </section>
      </div>

      {/* Recent Health Checks */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Health Checks</h2>
        {checks.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/80 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Latency</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Tools</th>
                  <th className="px-4 py-3 hidden md:table-cell">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {checks.slice(0, 20).map((c: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3"><StatusDot status={c.status} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(c.checkedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-400">{c.latencyMs !== null ? `${c.latencyMs}ms` : "—"}</td>
                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{c.toolCount ?? "—"}</td>
                    <td className="px-4 py-3 text-red-400/80 text-xs hidden md:table-cell truncate max-w-xs">{c.errorMessage || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-gray-500">
            No health checks recorded yet.
          </div>
        )}
      </section>
    </div>
  );
}
