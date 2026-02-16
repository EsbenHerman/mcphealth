import pool from "./db.js";

interface SmitheryServer {
  qualifiedName: string;
  displayName: string;
  description?: string;
  useCount: number;
  verified: boolean;
  remote: boolean;
  isDeployed: boolean;
  createdAt: string;
  homepage?: string;
  iconUrl?: string;
}

interface SmitheryResponse {
  servers: SmitheryServer[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const SMITHERY_BASE = "https://registry.smithery.ai";

function extractTransportFromSmithery(server: SmitheryServer): string {
  // Smithery servers marked as 'remote' are typically SSE/HTTP
  // Non-remote are stdio-based
  return server.remote ? "sse" : "stdio";
}

function extractGitHubRepoFromQualifiedName(qualifiedName: string): string | null {
  // Smithery qualified names are typically in format: npm:@scope/package or github:user/repo
  // For deduplication, we mainly care about GitHub repos
  if (qualifiedName.startsWith("github:")) {
    return `https://github.com/${qualifiedName.replace("github:", "")}`;
  }
  return null;
}

function generateSmitheryId(server: SmitheryServer): string {
  // Create unique identifier for Smithery servers using qualifiedName
  return `smithery:${server.qualifiedName}`;
}

async function upsertSmitheryServer(entry: SmitheryServer, seen: Set<string>): Promise<boolean> {
        const transportType = extractTransportFromSmithery(entry);
        const repoUrl = extractGitHubRepoFromQualifiedName(entry.qualifiedName);
        const smitheryId = generateSmitheryId(entry);

        if (seen.has(smitheryId)) return false;
        seen.add(smitheryId);

        // Check for existing server by GitHub repo URL or qualified name to avoid duplicates
        let existingServerId: string | null = null;
        
        if (repoUrl) {
          const { rows: existingByRepo } = await pool.query(
            "SELECT id FROM servers WHERE repo_url = $1", [repoUrl]
          );
          if (existingByRepo[0]) {
            existingServerId = existingByRepo[0].id;
          }
        }

        if (!existingServerId) {
          const { rows: existingByName } = await pool.query(
            "SELECT id FROM servers WHERE registry_name = $1", [entry.qualifiedName]
          );
          if (existingByName[0]) {
            existingServerId = existingByName[0].id;
          }
        }

        if (existingServerId) {
          await pool.query(
            `UPDATE servers SET
              external_use_count = $2,
              smithery_id = $3,
              last_synced_at = now()
            WHERE id = $1`,
            [existingServerId, entry.useCount, smitheryId]
          );
        } else {
          const { rows: upsertRows } = await pool.query(
            `INSERT INTO servers (
              registry_name, title, description,
              repo_url, website_url, icon_url,
              transport_type, registry_source, external_use_count,
              smithery_id, registry_status, published_at,
              last_synced_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
            ON CONFLICT (registry_name) DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              repo_url = EXCLUDED.repo_url,
              website_url = EXCLUDED.website_url,
              icon_url = EXCLUDED.icon_url,
              transport_type = EXCLUDED.transport_type,
              external_use_count = EXCLUDED.external_use_count,
              smithery_id = EXCLUDED.smithery_id,
              last_synced_at = now()
            RETURNING id, (xmax = 0) AS inserted`,
            [
              entry.qualifiedName,
              entry.displayName || null,
              entry.description || null,
              repoUrl,
              entry.homepage || null,
              entry.iconUrl || null,
              transportType,
              "smithery",
              entry.useCount,
              smitheryId,
              entry.verified ? "verified" : "unverified",
              entry.createdAt,
            ]
          );

          if (upsertRows[0]?.inserted) {
            await pool.query(
              "INSERT INTO server_events (server_id, event_type, new_value) VALUES ($1, 'server_added', $2)",
              [upsertRows[0].id, `${entry.qualifiedName} (Smithery)`]
            );
          }
        }

        return true;
}

async function fetchSmitheryPage(query: string, page: number, pageSize: number): Promise<SmitheryResponse> {
  const url = new URL("/servers", SMITHERY_BASE);
  url.searchParams.set("page", page.toString());
  url.searchParams.set("pageSize", pageSize.toString());
  if (query) url.searchParams.set("q", query);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Smithery API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<SmitheryResponse>;
}

export async function syncSmitheryRegistry(): Promise<number> {
  let totalUpserted = 0;
  const pageSize = 50;
  const seen = new Set<string>();

  console.log("[smithery-sync] Starting full sync...");

  // Smithery API caps non-search results at 100. Use search queries to get all servers.
  // Single-char queries a-z, 0-9, plus common prefixes to maximize coverage.
  const queries = "abcdefghijklmnopqrstuvwxyz0123456789".split("");

  for (const q of queries) {
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      try {
        const data = await fetchSmitheryPage(q, page, pageSize);
        const { servers, pagination } = data;

        if (!servers || servers.length === 0) break;

        for (const entry of servers) {
          const wasNew = await upsertSmitheryServer(entry, seen);
          if (wasNew) totalUpserted++;
        }

        hasMorePages = page < pagination.totalPages;
        page++;

      } catch (error) {
        console.error(`[smithery-sync] Error on q=${q} page ${page}:`, error);
        page++;
        if (page > 200) break;
      }
    }

    console.log(`[smithery-sync] q=${q} done — seen ${seen.size} unique servers so far`);
  }

  console.log(`[smithery-sync] Complete — ${totalUpserted} servers upserted, ${seen.size} unique from Smithery.ai`);
  return totalUpserted;
}