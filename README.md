# MCPHealth

MCP server health monitoring & trust scores. Continuously tests servers from the official MCP registry for availability, schema correctness, and latency.

## Structure

- `packages/api` — Hono API server + health check worker
- `packages/web` — Next.js 15 frontend
- `packages/shared` — Shared types & constants

## Setup

```bash
pnpm install
cp .env.example .env  # fill in DATABASE_URL
pnpm dev:api          # start API on :3001
pnpm dev:web          # start frontend on :3000
```
