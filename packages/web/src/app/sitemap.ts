import type { MetadataRoute } from "next";
import { getServers } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mcphealth.dev";

  let serverEntries: MetadataRoute.Sitemap = [];
  try {
    const data = await getServers({ limit: "5000" });
    serverEntries = data.servers.map((s) => ({
      url: `${siteUrl}/server/${encodeURIComponent(s.registryName)}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));
  } catch {
    // API unavailable — return homepage only
  }

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
    ...serverEntries,
  ];
}
