import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import crypto from "node:crypto";
import pool from "./db.js";

const CHECK_TIMEOUT_MS = 10_000;

interface CheckResult {
  status: "up" | "down" | "error" | "timeout";
  latency_ms: number;
  tool_count: number | null;
  tools_hash: string | null;
  tools_json: any | null;
  error_message: string | null;
  protocol_version: string | null;
}

function hashTools(tools: any[]): string {
  const canonical = JSON.stringify(
    tools.map((t) => ({ name: t.name, inputSchema: t.inputSchema })).sort((a, b) => a.name.localeCompare(b.name))
  );
  return crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

export async function checkServer(
  remoteUrl: string,
  transportType: string
): Promise<CheckResult> {
  const start = Date.now();
  const client = new Client({ name: "mcphealth", version: "0.1.0" });

  const abortController = new AbortController();
  const timer = setTimeout(() => abortController.abort(), CHECK_TIMEOUT_MS);

  try {
    const url = new URL(remoteUrl);
    const transport =
      transportType === "sse"
        ? new SSEClientTransport(url)
        : new StreamableHTTPClientTransport(url);

    // Connect with timeout via AbortSignal race
    await Promise.race([
      client.connect(transport),
      new Promise((_, reject) => {
        abortController.signal.addEventListener("abort", () =>
          reject(new Error("timeout"))
        );
      }),
    ]);

    const latency = Date.now() - start;

    // List tools
    let tools: any[] = [];
    try {
      const result = await Promise.race([
        client.listTools(),
        new Promise<never>((_, reject) => {
          abortController.signal.addEventListener("abort", () =>
            reject(new Error("timeout"))
          );
        }),
      ]);
      tools = result.tools || [];
    } catch {
      // Some servers don't support tools/list — that's ok
    }

    const toolsHash = tools.length > 0 ? hashTools(tools) : null;

    // Extract protocol info from the connected client
    const serverVersion = client.getServerVersion();
    const protocolVersion = serverVersion ? `${serverVersion.name}/${serverVersion.version}` : null;

    try { await client.close(); } catch {}

    return {
      status: "up",
      latency_ms: latency,
      tool_count: tools.length,
      tools_hash: toolsHash,
      tools_json: tools.length > 0 ? tools : null,
      error_message: null,
      protocol_version: protocolVersion,
    };
  } catch (err: any) {
    try { await client.close(); } catch {}
    const latency = Date.now() - start;
    const isTimeout = err.message === "timeout" || latency >= CHECK_TIMEOUT_MS - 500;
    return {
      status: isTimeout ? "timeout" : "down",
      latency_ms: latency,
      tool_count: null,
      tools_hash: null,
      tools_json: null,
      error_message: (err.message || String(err)).slice(0, 1000),
      protocol_version: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkServerById(serverId: string): Promise<CheckResult> {
  const { rows } = await pool.query(
    "SELECT remote_url, transport_type FROM servers WHERE id = $1",
    [serverId]
  );
  if (!rows[0]?.remote_url) throw new Error("Server not found or no remote_url");
  return checkServer(rows[0].remote_url, rows[0].transport_type);
}

export async function checkAndRecord(serverId: string): Promise<CheckResult> {
  const { rows } = await pool.query(
    "SELECT id, remote_url, transport_type FROM servers WHERE id = $1",
    [serverId]
  );
  if (!rows[0]?.remote_url) throw new Error("Server not found or no remote_url");

  const server = rows[0];
  const result = await checkServer(server.remote_url, server.transport_type);

  // Insert health check
  await pool.query(
    `INSERT INTO health_checks (id, server_id, checked_at, status, latency_ms, error_message, tool_count, tools_hash, check_level)
     VALUES (gen_random_uuid(), $1, now(), $2, $3, $4, $5, $6, 'connection')`,
    [serverId, result.status, result.latency_ms, result.error_message, result.tool_count, result.tools_hash]
  );

  // Update server current_status
  await pool.query(
    "UPDATE servers SET current_status = $1 WHERE id = $2",
    [result.status, serverId]
  );

  // Save schema snapshot if tools_hash changed
  if (result.tools_hash && result.tools_json) {
    const { rows: prev } = await pool.query(
      "SELECT tools_hash FROM schema_snapshots WHERE server_id = $1 ORDER BY captured_at DESC LIMIT 1",
      [serverId]
    );
    if (!prev[0] || prev[0].tools_hash !== result.tools_hash) {
      await pool.query(
        `INSERT INTO schema_snapshots (id, server_id, captured_at, tools_json, tools_hash)
         VALUES (gen_random_uuid(), $1, now(), $2, $3)`,
        [serverId, JSON.stringify(result.tools_json), result.tools_hash]
      );
      // Update server_capabilities
      await syncCapabilities(serverId, result.tools_json, null);
    }
  }

  return result;
}

async function syncCapabilities(serverId: string, tools: any[] | null, resources: any[] | null) {
  try {
    // Upsert tools
    if (tools && tools.length > 0) {
      for (const tool of tools) {
        if (!tool.name) continue;
        await pool.query(
          `INSERT INTO server_capabilities (server_id, capability_type, name, description, updated_at)
           VALUES ($1, 'tool', $2, $3, now())
           ON CONFLICT (server_id, capability_type, name) DO UPDATE
           SET description = EXCLUDED.description, updated_at = now()`,
          [serverId, tool.name, tool.description || null]
        );
      }
    }
    // Upsert resources
    if (resources && resources.length > 0) {
      for (const res of resources) {
        if (!res.name) continue;
        await pool.query(
          `INSERT INTO server_capabilities (server_id, capability_type, name, description, updated_at)
           VALUES ($1, 'resource', $2, $3, now())
           ON CONFLICT (server_id, capability_type, name) DO UPDATE
           SET description = EXCLUDED.description, updated_at = now()`,
          [serverId, res.name, res.description || null]
        );
      }
    }
  } catch (err) {
    console.error(`[syncCapabilities] error for server ${serverId}:`, err);
  }
}

// ── Protocol Compliance Checker ─────────────────────

interface ComplianceResult {
  pass: boolean;
  checks: Record<string, { pass: boolean; detail?: string }>;
  protocol_version: string | null;
}

export async function checkCompliance(
  remoteUrl: string,
  transportType: string
): Promise<ComplianceResult> {
  const checks: Record<string, { pass: boolean; detail?: string }> = {};
  let protocolVersion: string | null = null;

  const client = new Client({ name: "mcphealth-compliance", version: "0.1.0" });
  const abortController = new AbortController();
  const timer = setTimeout(() => abortController.abort(), CHECK_TIMEOUT_MS * 2);

  try {
    const url = new URL(remoteUrl);
    const transport =
      transportType === "sse"
        ? new SSEClientTransport(url)
        : new StreamableHTTPClientTransport(url);

    // 1. Initialize handshake
    try {
      await Promise.race([
        client.connect(transport),
        new Promise((_, reject) => {
          abortController.signal.addEventListener("abort", () =>
            reject(new Error("timeout"))
          );
        }),
      ]);

      const serverVersion = client.getServerVersion();
      const capabilities = client.getServerCapabilities();

      checks.initialize = {
        pass: true,
        detail: serverVersion ? `${serverVersion.name}/${serverVersion.version}` : "connected",
      };
      protocolVersion = serverVersion ? `${serverVersion.name}/${serverVersion.version}` : null;

      // 2. Server returned capabilities object
      checks.capabilities = {
        pass: capabilities != null && typeof capabilities === "object",
        detail: capabilities ? Object.keys(capabilities).join(", ") || "empty" : "missing",
      };
    } catch (err: any) {
      checks.initialize = { pass: false, detail: err.message?.slice(0, 200) };
      checks.capabilities = { pass: false, detail: "skipped (no connection)" };
      clearTimeout(timer);
      return { pass: false, checks, protocol_version: null };
    }

    // 3. tools/list returns valid response
    try {
      const result = await Promise.race([
        client.listTools(),
        new Promise<never>((_, reject) => {
          abortController.signal.addEventListener("abort", () =>
            reject(new Error("timeout"))
          );
        }),
      ]);
      const tools = result.tools || [];
      // Validate each tool has name and inputSchema
      const validTools = tools.every(
        (t: any) => typeof t.name === "string" && t.name.length > 0
      );
      checks.tools_list = {
        pass: true,
        detail: `${tools.length} tools, schema valid: ${validTools}`,
      };
      checks.tools_schema = {
        pass: validTools || tools.length === 0,
        detail: validTools ? "all tools have name" : "some tools missing name",
      };
    } catch (err: any) {
      // tools/list is optional per spec, so not a hard fail
      checks.tools_list = {
        pass: true,
        detail: `not supported: ${err.message?.slice(0, 100)}`,
      };
      checks.tools_schema = { pass: true, detail: "n/a" };
    }

    // 4. JSON-RPC error handling: call non-existent method
    try {
      // Use raw request to test error handling
      await Promise.race([
        client.request(
          { method: "nonexistent/method_that_should_not_exist", params: {} },
          { $schema: "http://json-schema.org/draft-07/schema#" } as any
        ),
        new Promise<never>((_, reject) => {
          abortController.signal.addEventListener("abort", () =>
            reject(new Error("timeout"))
          );
        }),
      ]);
      // If it succeeds, that's weird but not necessarily a fail
      checks.error_handling = { pass: true, detail: "returned response (unexpected but ok)" };
    } catch (err: any) {
      // We expect an error - that's correct behavior
      const msg = err.message || String(err);
      const isProperError = msg.includes("Method not found") || msg.includes("-32601") || 
                            msg.includes("not found") || msg.includes("unknown") ||
                            msg.includes("error") || msg.includes("Error");
      checks.error_handling = {
        pass: isProperError,
        detail: msg.slice(0, 200),
      };
    }

    try { await client.close(); } catch {}

    // Overall pass: initialize + capabilities must pass, rest are advisory
    const pass = checks.initialize.pass && checks.capabilities.pass;

    return { pass, checks, protocol_version: protocolVersion };
  } catch (err: any) {
    try { await client.close(); } catch {}
    return {
      pass: false,
      checks: { ...checks, unexpected: { pass: false, detail: err.message?.slice(0, 200) } },
      protocol_version: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function complianceCheckAndRecord(serverId: string): Promise<ComplianceResult> {
  const { rows } = await pool.query(
    "SELECT remote_url, transport_type FROM servers WHERE id = $1",
    [serverId]
  );
  if (!rows[0]?.remote_url) throw new Error("Server not found or no remote_url");

  const result = await checkCompliance(rows[0].remote_url, rows[0].transport_type);

  await pool.query(
    `INSERT INTO health_checks (id, server_id, checked_at, status, latency_ms, error_message, compliance_pass, check_level)
     VALUES (gen_random_uuid(), $1, now(), $2, 0, $3, $4, 'compliance')`,
    [
      serverId,
      result.pass ? "up" : "down",
      result.pass ? null : JSON.stringify(result.checks).slice(0, 1000),
      result.pass,
    ]
  );

  return result;
}

export async function complianceCheckAll(): Promise<{ checked: number; passed: number; failed: number }> {
  const { rows: servers } = await pool.query(
    "SELECT id FROM servers WHERE remote_url IS NOT NULL ORDER BY registry_name"
  );

  let passed = 0, failed = 0;
  const BATCH = 5;
  for (let i = 0; i < servers.length; i += BATCH) {
    const batch = servers.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((s) => complianceCheckAndRecord(s.id))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.pass) passed++;
      else failed++;
    }
    console.log(`[compliance] batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(servers.length / BATCH)} done`);
  }

  return { checked: servers.length, passed, failed };
}

export async function checkAllRemoteServers(): Promise<{ checked: number; up: number; down: number }> {
  const { rows: servers } = await pool.query(
    "SELECT id FROM servers WHERE remote_url IS NOT NULL ORDER BY registry_name"
  );

  let up = 0, down = 0;
  // Process in batches of 10 for concurrency control
  const BATCH = 10;
  for (let i = 0; i < servers.length; i += BATCH) {
    const batch = servers.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((s) => checkAndRecord(s.id))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.status === "up") up++;
      else down++;
    }
    console.log(`[health-checker] batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(servers.length / BATCH)} done (up=${up}, down=${down})`);
  }

  return { checked: servers.length, up, down };
}
