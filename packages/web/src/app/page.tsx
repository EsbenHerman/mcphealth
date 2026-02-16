import { getStats } from "@/lib/api";
import { Landing } from "@/components/Landing";

export default async function Home() {
  let stats = null;

  try {
    stats = await getStats();
  } catch {
    // API unavailable
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "MCPHealth",
    url: "https://mcphealth.dev",
    description: "Real-time health monitoring, uptime tracking, and trust scores for MCP servers.",
    applicationCategory: "DeveloperApplication",
  };

  return (
    <div className="space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {stats && <Landing totalServers={stats.totalServers} avgScore={stats.avgTrustScore} />}
    </div>
  );
}
