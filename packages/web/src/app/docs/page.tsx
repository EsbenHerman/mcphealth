import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation",
  description: "Complete API reference for the MCPHealth platform — endpoints, parameters, and examples.",
};

const BASE = "https://api.mcphealth.dev";

interface Param {
  name: string;
  type: string;
  default?: string;
  description: string;
}

interface Endpoint {
  id: string;
  method: string;
  path: string;
  description: string;
  params?: Param[];
  curl: string;
  response: string;
}

const endpoints: Endpoint[] = [
  {
    id: "root",
    method: "GET",
    path: "/",
    description: "Returns basic API information including the service name and version.",
    curl: `curl ${BASE}/`,
    response: JSON.stringify({ name: "mcphealth-api", version: "0.1.0" }, null, 2),
  },
  {
    id: "health",
    method: "GET",
    path: "/health",
    description: "Simple health check endpoint. Returns 200 if the API is running.",
    curl: `curl ${BASE}/health`,
    response: JSON.stringify({ status: "ok", timestamp: "2025-02-15T04:00:00.000Z" }, null, 2),
  },
  {
    id: "stats",
    method: "GET",
    path: "/api/stats",
    description: "Platform-wide statistics: total servers, status breakdown, average trust scores, uptime, and latency.",
    curl: `curl ${BASE}/api/stats`,
    response: JSON.stringify({
      ok: true,
      totalServers: 247,
      serversUp: 183,
      serversDown: 12,
      serversDegraded: 8,
      serversUnknown: 44,
      remoteServers: 203,
      localOnlyServers: 44,
      avgTrustScore: 72.4,
      avgUptime24h: 0.96,
      avgLatencyP50: 342,
    }, null, 2),
  },
  {
    id: "servers-list",
    method: "GET",
    path: "/api/servers",
    description: "Paginated list of MCP servers with filtering, search, and sorting.",
    params: [
      { name: "limit", type: "integer", default: "50", description: "Results per page (1–200)" },
      { name: "offset", type: "integer", default: "0", description: "Pagination offset" },
      { name: "search", type: "string", description: "Search by name, title, or description" },
      { name: "status", type: "string", description: 'Filter by status: up, down, degraded, unknown, remote' },
      { name: "transport_type", type: "string", description: "Filter by transport type (e.g. sse, stdio)" },
      { name: "score_min", type: "number", description: "Minimum trust score" },
      { name: "score_max", type: "number", description: "Maximum trust score" },
      { name: "sort", type: "string", default: "trust_score", description: "Sort field: trust_score, name, uptime, latency, status" },
      { name: "order", type: "string", default: "desc", description: "Sort order: asc or desc" },
    ],
    curl: `curl "${BASE}/api/servers?limit=2&sort=trust_score&order=desc"`,
    response: JSON.stringify({
      ok: true,
      total: 247,
      limit: 2,
      offset: 0,
      servers: [
        {
          id: 42,
          registryName: "@anthropic/mcp-server",
          title: "Anthropic MCP Server",
          description: "Official Anthropic MCP server implementation",
          transportType: "sse",
          currentStatus: "up",
          trustScore: 94.7,
          latencyP50: 120,
          latencyP95: 280,
          uptime24h: 1.0,
          uptime7d: 0.998,
          uptime30d: 0.995,
        },
        {
          id: 87,
          registryName: "@modelcontextprotocol/server-filesystem",
          title: "Filesystem Server",
          description: "MCP server for filesystem operations",
          transportType: "stdio",
          currentStatus: "local",
          trustScore: 88.2,
          latencyP50: null,
          latencyP95: null,
          uptime24h: null,
          uptime7d: null,
          uptime30d: null,
        },
      ],
    }, null, 2),
  },
  {
    id: "server-detail",
    method: "GET",
    path: "/api/servers/:name",
    description: "Full details for a specific server, looked up by its registry name. The name may contain slashes (e.g. @scope/package).",
    curl: `curl ${BASE}/api/servers/@anthropic/mcp-server`,
    response: JSON.stringify({
      ok: true,
      server: {
        id: 42,
        registryName: "@anthropic/mcp-server",
        title: "Anthropic MCP Server",
        description: "Official Anthropic MCP server implementation",
        transportType: "sse",
        remoteUrl: "https://mcp.anthropic.com/sse",
        currentStatus: "up",
        trustScore: 94.7,
        latencyP50: 120,
        latencyP95: 280,
        uptime24h: 1.0,
        uptime7d: 0.998,
        uptime30d: 0.995,
        lastCheckedAt: "2025-02-15T03:45:00.000Z",
        createdAt: "2025-01-10T12:00:00.000Z",
      },
    }, null, 2),
  },
  {
    id: "server-score",
    method: "GET",
    path: "/api/servers/:name/score",
    description: "Detailed trust score breakdown showing individual scoring components.",
    curl: `curl ${BASE}/api/servers/@anthropic/mcp-server/score`,
    response: JSON.stringify({
      ok: true,
      registryName: "@anthropic/mcp-server",
      totalScore: 94.7,
      breakdown: {
        availability: { score: 98, weight: 0.3, detail: "100% uptime (24h)" },
        latency: { score: 92, weight: 0.15, detail: "p50=120ms, p95=280ms" },
        stability: { score: 95, weight: 0.2, detail: "No status flaps in 7d" },
        compliance: { score: 90, weight: 0.15, detail: "Valid MCP handshake" },
        metadata: { score: 100, weight: 0.1, detail: "All fields present" },
        freshness: { score: 88, weight: 0.1, detail: "Checked 15m ago" },
      },
    }, null, 2),
  },
  {
    id: "server-checks",
    method: "GET",
    path: "/api/servers/:name/checks",
    description: "Health check history for a specific server. Defaults to last 24 hours.",
    params: [
      { name: "limit", type: "integer", default: "100", description: "Results per page (1–500)" },
      { name: "offset", type: "integer", default: "0", description: "Pagination offset" },
      { name: "since", type: "ISO 8601", default: "24h ago", description: "Only include checks after this timestamp" },
    ],
    curl: `curl "${BASE}/api/servers/@anthropic/mcp-server/checks?limit=2"`,
    response: JSON.stringify({
      ok: true,
      total: 96,
      limit: 2,
      offset: 0,
      checks: [
        {
          id: 12045,
          status: "up",
          latencyMs: 118,
          errorMessage: null,
          checkLevel: "full",
          checkedAt: "2025-02-15T03:45:00.000Z",
        },
        {
          id: 12001,
          status: "up",
          latencyMs: 125,
          errorMessage: null,
          checkLevel: "full",
          checkedAt: "2025-02-15T03:30:00.000Z",
        },
      ],
    }, null, 2),
  },
  {
    id: "score-history",
    method: "GET",
    path: "/api/servers/:name/score-history",
    description: "Historical trust scores over time, useful for charting score trends.",
    params: [
      { name: "days", type: "integer", default: "30", description: "Number of days of history (1–365)" },
    ],
    curl: `curl "${BASE}/api/servers/@anthropic/mcp-server/score-history?days=7"`,
    response: JSON.stringify({
      ok: true,
      history: [
        {
          scoredAt: "2025-02-08T12:00:00.000Z",
          totalScore: 91.2,
          availabilityScore: 95,
          latencyScore: 88,
          stabilityScore: 90,
          complianceScore: 90,
          metadataScore: 100,
          freshnessScore: 85,
        },
        {
          scoredAt: "2025-02-09T12:00:00.000Z",
          totalScore: 93.5,
          availabilityScore: 98,
          latencyScore: 90,
          stabilityScore: 92,
          complianceScore: 90,
          metadataScore: 100,
          freshnessScore: 88,
        },
      ],
    }, null, 2),
  },
  {
    id: "badge",
    method: "GET",
    path: "/api/badge/:name",
    description: "Returns an SVG trust badge for a server, suitable for embedding in READMEs. Cached for 5 minutes.",
    curl: `curl ${BASE}/api/badge/@anthropic/mcp-server`,
    response: `<!-- SVG badge image -->
<svg xmlns="http://www.w3.org/2000/svg" width="155" height="20">
  <!-- Returns a shields.io-style badge showing: -->
  <!-- MCPHealth | 95 · up -->
</svg>

<!-- Embed in Markdown: -->
![MCPHealth](https://api.mcphealth.dev/api/badge/@anthropic/mcp-server)`,
  },
  {
    id: "feed",
    method: "GET",
    path: "/api/feed",
    description: "RSS 2.0 feed of recent health check results (last 24 hours, up to 100 items). Subscribe in any RSS reader to monitor status changes.",
    curl: `curl ${BASE}/api/feed`,
    response: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>MCPHealth — Status Feed</title>
    <link>https://mcphealth.dev</link>
    <description>Recent health check results for MCP servers</description>
    <item>
      <title>Anthropic MCP Server — up</title>
      <link>https://mcphealth.dev/server/@anthropic/mcp-server</link>
      <description>Status: up</description>
      <pubDate>Sat, 15 Feb 2025 03:45:00 GMT</pubDate>
    </item>
  </channel>
</rss>`,
  },
];

function MethodBadge({ method }: { method: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-green-500/15 px-2 py-0.5 text-xs font-bold text-green-400 ring-1 ring-inset ring-green-500/30">
      {method}
    </span>
  );
}

function ParamsTable({ params }: { params: Param[] }) {
  return (
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-gray-400">
            <th className="pb-2 pr-4 font-medium">Parameter</th>
            <th className="pb-2 pr-4 font-medium">Type</th>
            <th className="pb-2 pr-4 font-medium">Default</th>
            <th className="pb-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.name} className="border-b border-gray-800/50">
              <td className="py-2 pr-4 font-mono text-green-400">{p.name}</td>
              <td className="py-2 pr-4 text-gray-400">{p.type}</td>
              <td className="py-2 pr-4 text-gray-500">{p.default || "—"}</td>
              <td className="py-2 text-gray-300">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div className="mt-3">
      {label && <div className="text-xs text-gray-500 mb-1">{label}</div>}
      <pre className="overflow-x-auto rounded-lg bg-gray-900 border border-gray-800 p-4 text-sm text-gray-300">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight mb-3">API Documentation</h1>
        <p className="text-gray-400 text-lg">
          The MCPHealth API provides programmatic access to server health data, trust scores, and status information.
        </p>
        <div className="mt-4 rounded-lg bg-gray-900 border border-gray-800 p-4 text-sm">
          <span className="text-gray-400">Base URL:</span>{" "}
          <code className="text-green-400 font-mono">{BASE}</code>
        </div>
      </div>

      {/* Table of contents */}
      <div className="mb-12 rounded-lg bg-gray-900/50 border border-gray-800 p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Endpoints</h2>
        <nav className="grid gap-1.5">
          {endpoints.map((ep) => (
            <a
              key={ep.id}
              href={`#${ep.id}`}
              className="flex items-center gap-3 text-sm text-gray-300 hover:text-green-400 transition-colors py-0.5"
            >
              <span className="inline-flex w-10 justify-center rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-bold text-green-400 ring-1 ring-green-500/20">
                {ep.method}
              </span>
              <code className="font-mono text-gray-400">{ep.path}</code>
            </a>
          ))}
        </nav>
      </div>

      {/* Endpoints */}
      <div className="space-y-16">
        {endpoints.map((ep) => (
          <section key={ep.id} id={ep.id} className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-2">
              <MethodBadge method={ep.method} />
              <code className="text-lg font-mono font-semibold text-gray-100">{ep.path}</code>
              <a href={`#${ep.id}`} className="text-gray-600 hover:text-gray-400 transition-colors">#</a>
            </div>
            <p className="text-gray-400 mb-4">{ep.description}</p>

            {ep.params && <ParamsTable params={ep.params} />}

            <CodeBlock label="Example request">{ep.curl}</CodeBlock>
            <CodeBlock label="Example response">{ep.response}</CodeBlock>
          </section>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-16 mb-8 rounded-lg bg-gray-900/50 border border-gray-800 p-6 text-sm text-gray-400">
        <p>
          All endpoints return JSON unless otherwise noted. Errors follow the shape{" "}
          <code className="text-gray-300">{"{ ok: false, error: \"message\" }"}</code> with appropriate HTTP status codes.
        </p>
        <p className="mt-2">
          Rate limiting is not currently enforced, but please be respectful. Badge and feed responses are cached for 5 minutes.
        </p>
      </div>
    </div>
  );
}
