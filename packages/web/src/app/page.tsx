import { SCORE_TIERS } from "@mcphealth/shared";

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-3xl font-bold">MCP Server Health Dashboard</h2>
        <p className="text-gray-400">
          Real-time monitoring and trust scores for every registered MCP server.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SCORE_TIERS.map((tier) => (
          <div
            key={tier.tier}
            className="rounded-lg border border-gray-800 bg-gray-900 p-4"
          >
            <div className="text-2xl">{tier.emoji}</div>
            <div className="mt-1 font-semibold">{tier.label}</div>
            <div className="text-sm text-gray-400">
              {tier.min}–{tier.max} score
            </div>
          </div>
        ))}
      </section>

      <p className="text-sm text-gray-500">
        Server list coming soon. Monitoring all servers from the official MCP
        registry.
      </p>
    </div>
  );
}
