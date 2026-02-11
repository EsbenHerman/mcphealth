import Link from "next/link";
import { getServer, getServerChecks, getServerScore } from "@/lib/api";
import { ScoreBadge } from "@/components/ScoreBadge";
import { StatusDot } from "@/components/StatusDot";
import { SCORE_WEIGHTS } from "@mcphealth/shared";

function ScoreBar({ label, score, weight }: { label: string; score: number | null; weight: number }) {
  const pct = score !== null ? Math.min(100, Math.max(0, score)) : 0;
  const color =
    pct >= 90 ? "bg-green-400" :
    pct >= 70 ? "bg-yellow-400" :
    pct >= 50 ? "bg-orange-400" : "bg-red-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-300">{label}</span>
        <span className="text-gray-500">{score !== null ? Math.round(score) : "—"} <span className="text-gray-600">({Math.round(weight * 100)}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CheckStatusBadge({ status }: { status: string }) {
  const cls =
    status === "up" ? "text-green-400 bg-green-500/10" :
    status === "down" ? "text-red-400 bg-red-500/10" :
    status === "timeout" ? "text-yellow-400 bg-yellow-500/10" :
                           "text-gray-400 bg-gray-500/10";
  return <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}

function MetaItem({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-200">
        {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">{value}</a> : value}
      </dd>
    </div>
  );
}

export default async function ServerDetail({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  let server: any, score: any, checks: any;
  let error = false;
  try {
    [server, score, checks] = await Promise.all([
      getServer(decodedName),
      getServerScore(decodedName).catch(() => null),
      getServerChecks(decodedName, { limit: "20" }).catch(() => ({ checks: [] })),
    ]);
  } catch {
    error = true;
  }

  if (error || !server) {
    return (
      <div className="space-y-4">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-200">← Back</Link>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-gray-400">
          Server not found or API unavailable.
        </div>
      </div>
    );
  }

  // Build status timeline from checks (last 24 items)
  const timeline = (checks?.checks ?? []).slice(0, 24).reverse();

  return (
    <div className="space-y-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors">
        ← Back to dashboard
      </Link>

      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <StatusDot status={server.currentStatus} />
            <h1 className="text-3xl font-bold tracking-tight">{server.title || server.registryName}</h1>
          </div>
          {server.description && <p className="max-w-2xl text-gray-400">{server.description}</p>}
        </div>
        <div className="flex-shrink-0">
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Trust Score</p>
            <p className="mt-1 text-4xl font-bold">
              <ScoreBadge score={server.trustScore} />
            </p>
          </div>
        </div>
      </section>

      {/* Metadata */}
      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
        <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <MetaItem label="Registry Name" value={server.registryName} />
          <MetaItem label="Transport" value={server.transportType} />
          {server.version && <MetaItem label="Version" value={server.version} />}
          {server.repoUrl && <MetaItem label="Repository" value="GitHub →" href={server.repoUrl} />}
          {server.websiteUrl && <MetaItem label="Website" value="Visit →" href={server.websiteUrl} />}
        </dl>
      </section>

      {/* Score breakdown */}
      {score && (
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 space-y-4">
          <h2 className="text-lg font-semibold">Score Breakdown</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <ScoreBar label="Availability" score={score.availability} weight={SCORE_WEIGHTS.availability} />
            <ScoreBar label="Latency" score={score.latency} weight={SCORE_WEIGHTS.latency} />
            <ScoreBar label="Schema Stability" score={score.schemaStability} weight={SCORE_WEIGHTS.schemaStability} />
            <ScoreBar label="Protocol Compliance" score={score.protocolCompliance} weight={SCORE_WEIGHTS.protocolCompliance} />
            <ScoreBar label="Metadata Quality" score={score.metadataQuality} weight={SCORE_WEIGHTS.metadataQuality} />
            <ScoreBar label="Freshness" score={score.freshness} weight={SCORE_WEIGHTS.freshness} />
          </div>
        </section>
      )}

      {/* Status timeline */}
      {timeline.length > 0 && (
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 space-y-3">
          <h2 className="text-lg font-semibold">Status History (Recent)</h2>
          <div className="flex items-end gap-0.5 h-8">
            {timeline.map((c: any, i: number) => {
              const color =
                c.status === "up" ? "bg-green-400" :
                c.status === "down" ? "bg-red-400" :
                c.status === "timeout" ? "bg-yellow-400" : "bg-gray-600";
              return (
                <div key={i} className={`flex-1 h-full rounded-sm ${color} opacity-80 hover:opacity-100 transition-opacity`} title={`${c.status} — ${new Date(c.checkedAt).toLocaleString()}`} />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Oldest</span>
            <span>Latest</span>
          </div>
        </section>
      )}

      {/* Recent checks */}
      {checks?.checks?.length > 0 && (
        <section className="rounded-xl border border-gray-800 overflow-hidden">
          <div className="bg-gray-900/80 px-5 py-3 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Recent Health Checks</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Level</th>
                  <th className="px-4 py-2.5 hidden sm:table-cell">Latency</th>
                  <th className="px-4 py-2.5 hidden md:table-cell">Tools</th>
                  <th className="px-4 py-2.5 hidden lg:table-cell">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {checks.checks.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{new Date(c.checkedAt).toLocaleString()}</td>
                    <td className="px-4 py-2.5"><CheckStatusBadge status={c.status} /></td>
                    <td className="px-4 py-2.5 text-gray-400">{c.checkLevel}</td>
                    <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">{c.latencyMs !== null ? `${c.latencyMs}ms` : "—"}</td>
                    <td className="px-4 py-2.5 text-gray-400 hidden md:table-cell">{c.toolCount ?? "—"}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs hidden lg:table-cell max-w-xs truncate">{c.errorMessage ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
