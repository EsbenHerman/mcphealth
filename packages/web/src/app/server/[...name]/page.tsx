import Link from "next/link";
import type { Metadata } from "next";
import { getServer, getServerScore, getServerChecks, getScoreHistory, type ScoreBreakdown, type ScoreHistoryPoint } from "@/lib/api";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ScoreChart } from "@/components/ScoreChart";
import { StatusDot } from "@/components/StatusDot";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mcphealth.dev";

export async function generateMetadata({ params }: { params: Promise<{ name: string[] }> }): Promise<Metadata> {
  const { name: nameParts } = await params;
  const serverName = nameParts.join("/");
  try {
    const server = await getServer(serverName);
    const title = server.title || serverName;
    const description = server.description || `Health monitoring and trust score for ${title} MCP server.`;
    const score = server.trustScore !== null ? Math.round(server.trustScore) : null;
    const ogParams = new URLSearchParams({ title });
    if (score !== null) ogParams.set("score", String(score));
    if (server.currentStatus) ogParams.set("status", server.currentStatus);

    return {
      title,
      description,
      openGraph: {
        title: `${title} — MCPHealth`,
        description,
        url: `${SITE_URL}/server/${encodeURIComponent(serverName)}`,
        images: [{ url: `/og?${ogParams}`, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} — MCPHealth`,
        description,
        images: [`/og?${ogParams}`],
      },
    };
  } catch {
    return { title: serverName };
  }
}

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
  let scoreHistory: ScoreHistoryPoint[] = [];
  let error = false;

  try {
    [server, score, { checks }, { history: scoreHistory }] = await Promise.all([
      getServer(serverName),
      getServerScore(serverName).catch(() => null),
      getServerChecks(serverName, { limit: "48" }).catch(() => ({ checks: [] })),
      getScoreHistory(serverName, 30).catch(() => ({ history: [] })),
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
    { label: "Availability", key: "availability" as keyof ScoreBreakdown["factors"], weight: "30%" },
    { label: "Schema Stability", key: "schemaStability" as keyof ScoreBreakdown["factors"], weight: "20%" },
    { label: "Latency", key: "latency" as keyof ScoreBreakdown["factors"], weight: "12%" },
    { label: "Protocol Compliance", key: "protocolCompliance" as keyof ScoreBreakdown["factors"], weight: "12%" },
    { label: "Popularity", key: "popularity" as keyof ScoreBreakdown["factors"], weight: "10%" },
    { label: "Metadata Quality", key: "metadataQuality" as keyof ScoreBreakdown["factors"], weight: "8%" },
    { label: "Freshness", key: "freshness" as keyof ScoreBreakdown["factors"], weight: "8%" },
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
          <a
            href={`https://api.mcphealth.dev/api/feed/${encodeURIComponent(serverName)}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 text-orange-400 hover:text-orange-300 transition-colors"
            title="RSS feed for this server"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="6.18" cy="17.82" r="2.18"/><path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z"/></svg>
            RSS
          </a>
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
          {server.registry_source && (
            <span className="rounded-md bg-gray-800 border border-gray-800 px-2.5 py-1 text-gray-400">
              {server.registry_source === "smithery" ? "Smithery.ai" : "Official Registry"}
            </span>
          )}
          {server.external_use_count && (
            <span className="rounded-md bg-green-500/10 border border-green-500/20 px-2.5 py-1 text-green-400">
              {server.external_use_count >= 1000000 
                ? `${(server.external_use_count / 1000000).toFixed(1)}M uses on Smithery`
                : `${server.external_use_count.toLocaleString()} uses`}
            </span>
          )}
        </div>
      </section>

      {/* Capabilities (tools & resources) */}
      {server.capabilities && server.capabilities.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Capabilities</h2>
          <div className="flex flex-wrap gap-2">
            {server.capabilities.map((cap: any) => (
              <span
                key={`${cap.capabilityType}-${cap.name}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  cap.capabilityType === "tool"
                    ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                    : "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                }`}
                title={cap.description || undefined}
              >
                <span>{cap.capabilityType === "tool" ? "🔧" : "📦"}</span>
                {cap.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Local-only notice */}
      {(server.currentStatus === "local" || server.currentStatus === "unknown") && (
        <section className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 flex gap-3 items-start">
          <span className="text-blue-400 text-lg mt-0.5">ℹ</span>
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-300">This is a local-only server</p>
            <p className="text-sm text-gray-400">
              This server uses <strong className="text-gray-300">stdio</strong> transport, meaning it runs locally on your machine rather than over the network. 
              MCPHealth can only perform health checks on remote servers (HTTP/SSE). Local servers don&apos;t have uptime, latency, or availability data — but that&apos;s expected and doesn&apos;t indicate a problem.
            </p>
          </div>
        </section>
      )}

      {/* Two-column: Score breakdown + Status history */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trust Score Breakdown */}
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Trust Score Breakdown</h2>
          {score ? (
            <div className="space-y-3">
              {factors.map((f) => (
                <ProgressBar key={f.key} label={f.label} value={score.factors[f.key]?.score ?? null} weight={f.weight} />
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

      {/* Trust Score Trend */}
      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Trust Score Trend (30 days)</h2>
        <ScoreChart history={scoreHistory} />
      </section>

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
