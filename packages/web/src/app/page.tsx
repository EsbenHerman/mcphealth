import Link from "next/link";
import { getServers, getStats } from "@/lib/api";
import { ScoreBadge } from "@/components/ScoreBadge";
import { StatusDot } from "@/components/StatusDot";
import { ServerFilters } from "@/components/ServerFilters";
import { Pagination } from "@/components/Pagination";
import { Suspense } from "react";

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 backdrop-blur">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${accent ?? "text-gray-100"}`}>{value}</p>
    </div>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const apiParams: Record<string, string> = {};
  if (params.search) apiParams.search = params.search;
  if (params.status) apiParams.status = params.status;
  if (params.transport_type) apiParams.transport_type = params.transport_type;
  if (params.sort) { apiParams.sort = params.sort; apiParams.order = "desc"; }
  apiParams.limit = "20";
  if (params.offset) apiParams.offset = params.offset;

  let stats = null;
  let serverData = null;
  let error = false;

  try {
    [stats, serverData] = await Promise.all([getStats(), getServers(apiParams)]);
  } catch {
    error = true;
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-80 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative space-y-3">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            MCP Server Health
            <span className="text-green-400"> & Trust Scores</span>
          </h2>
          <p className="max-w-2xl text-gray-400">
            Real-time monitoring and trust scores for MCP servers from the official registry.
          </p>
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total Servers" value={stats.totalServers} />
          <StatCard label="Servers Up" value={stats.serversUp} accent="text-green-400" />
          <StatCard label="Servers Down" value={stats.serversDown} accent="text-red-400" />
          <StatCard label="Local Only (stdio)" value={stats.localOnlyServers} accent="text-gray-400" />
          <StatCard label="Avg Trust Score" value={stats.avgTrustScore !== null ? Math.round(stats.avgTrustScore) : "—"} accent="text-yellow-400" />
        </section>
      )}

      {/* Filters */}
      <Suspense>
        <ServerFilters />
      </Suspense>

      {/* Server list */}
      {error ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-gray-400">
          <p className="text-lg font-medium">Unable to connect to API</p>
          <p className="mt-1 text-sm">Make sure the backend is running at {process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}</p>
        </div>
      ) : serverData && serverData.servers.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/80 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Server</th>
                  <th className="px-4 py-3 hidden md:table-cell">Transport</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Latency</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Uptime 24h</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {serverData.servers.map((s) => (
                  <tr key={s.registryName} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <StatusDot status={s.currentStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/server/${s.registryName}`} className="group">
                        <p className="font-medium text-gray-100 group-hover:text-green-400 transition-colors">{s.title || s.registryName}</p>
                        {s.description && (
                          <p className="mt-0.5 text-xs text-gray-500 line-clamp-1 max-w-md">{s.description}</p>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="rounded-md bg-gray-800 px-2 py-0.5 text-xs text-gray-400">{s.transportType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={s.trustScore} />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-400">
                      {s.latencyP50 !== null ? `${s.latencyP50}ms` : "—"}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-400">
                      {s.uptime24h !== null ? `${Number(s.uptime24h).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Suspense>
            <Pagination total={serverData.total} limit={serverData.limit} offset={serverData.offset} />
          </Suspense>
        </>
      ) : serverData ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-gray-500">
          No servers found matching your filters.
        </div>
      ) : null}
    </div>
  );
}
