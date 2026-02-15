import pool from "./db.js";

interface RegistryServer {
  server: {
    name: string;
    title?: string;
    description?: string;
    version?: string;
    repository?: { url?: string; source?: string };
    websiteUrl?: string;
    icons?: Array<{ src: string; mimeType?: string; sizes?: string[] }>;
    packages?: Array<{ registryType: string; identifier?: string; transport?: { type: string } }>;
    remotes?: Array<{ type: string; url: string }>;
  };
  _meta?: {
    "io.modelcontextprotocol.registry/official"?: {
      status?: string;
      publishedAt?: string;
      updatedAt?: string;
      isLatest?: boolean;
    };
  };
}

interface RegistryResponse {
  servers: RegistryServer[];
  metadata: { nextCursor?: string; count: number };
}

const REGISTRY_BASE = "https://registry.modelcontextprotocol.io";

function extractTransportType(entry: RegistryServer["server"]): string {
  if (entry.remotes && entry.remotes.length > 0) {
    return entry.remotes[0].type; // "streamable-http" or "sse"
  }
  if (entry.packages && entry.packages.length > 0) {
    return "stdio";
  }
  return "unknown";
}

function extractRemoteUrl(entry: RegistryServer["server"]): string | null {
  if (entry.remotes && entry.remotes.length > 0) {
    return entry.remotes[0].url;
  }
  return null;
}

function extractMeta(entry: RegistryServer) {
  const meta = entry._meta?.["io.modelcontextprotocol.registry/official"];
  return {
    status: meta?.status ?? "unknown",
    publishedAt: meta?.publishedAt ?? null,
    updatedAt: meta?.updatedAt ?? null,
  };
}

export async function syncRegistry(): Promise<number> {
  let cursor: string | undefined;
  let totalUpserted = 0;

  console.log("[registry-sync] Starting full sync...");

  while (true) {
    const url = new URL("/v0/servers", REGISTRY_BASE);
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Registry API error: ${res.status} ${res.statusText}`);
    }

    const data: RegistryResponse = await res.json();
    const { servers, metadata } = data;

    if (!servers || servers.length === 0) break;

    for (const entry of servers) {
      const s = entry.server;
      const meta = extractMeta(entry);
      const transportType = extractTransportType(s);
      const remoteUrl = extractRemoteUrl(s);
      const iconUrl = s.icons?.[0]?.src ?? null;
      const repoUrl = s.repository?.url ?? null;

      const { rows: upsertRows } = await pool.query(
        `INSERT INTO servers (
          registry_name, title, description, version,
          repo_url, website_url, icon_url,
          transport_type, remote_url, registry_status,
          published_at, registry_updated_at, last_synced_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
        ON CONFLICT (registry_name) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          version = EXCLUDED.version,
          repo_url = EXCLUDED.repo_url,
          website_url = EXCLUDED.website_url,
          icon_url = EXCLUDED.icon_url,
          transport_type = EXCLUDED.transport_type,
          remote_url = EXCLUDED.remote_url,
          registry_status = EXCLUDED.registry_status,
          published_at = EXCLUDED.published_at,
          registry_updated_at = EXCLUDED.registry_updated_at,
          last_synced_at = now()
        RETURNING id, (xmax = 0) AS inserted`,
        [
          s.name,
          s.title ?? null,
          s.description ?? null,
          s.version ?? null,
          repoUrl,
          s.websiteUrl ?? null,
          iconUrl,
          transportType,
          remoteUrl,
          meta.status,
          meta.publishedAt,
          meta.updatedAt,
        ]
      );

      // Emit server_added event for new servers
      if (upsertRows[0]?.inserted) {
        await pool.query(
          "INSERT INTO server_events (server_id, event_type, new_value) VALUES ($1, 'server_added', $2)",
          [upsertRows[0].id, s.name]
        );
      }

      totalUpserted++;
    }

    console.log(`[registry-sync] Page done — ${servers.length} servers (total so far: ${totalUpserted})`);

    if (!metadata.nextCursor) break;
    cursor = metadata.nextCursor;
  }

  console.log(`[registry-sync] Complete — ${totalUpserted} servers synced.`);
  return totalUpserted;
}
