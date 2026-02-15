# MCPHealth

**Real-time health monitoring and trust scores for MCP servers.**

[![MCPHealth Badge](https://api.mcphealth.dev/api/badge/composio)](https://mcphealth.dev)

[🌐 Live Site](https://mcphealth.dev) · [📡 API](https://api.mcphealth.dev) · [📰 RSS Feed](https://api.mcphealth.dev/api/feed)

---

MCPHealth continuously monitors servers from the [MCP registry](https://registry.modelcontextprotocol.io) for availability, schema correctness, and latency — then distills it into a **trust score (0–100)** so you can pick reliable servers with confidence.

## Features

- **Trust Scores** — composite 0–100 score based on uptime, latency, schema validity, and more
- **Automated Health Checks** — every 15 minutes for all remote servers
- **Historical Trends** — 30-day score history with visual charts
- **Embeddable Badges** — SVG badges for any server: `https://api.mcphealth.dev/api/badge/{name}`
- **RSS Feed** — subscribe to the latest health check results
- **REST API** — full programmatic access to all data

## Embeddable Badge

Add a trust score badge to your README:

```markdown
![MCPHealth](https://api.mcphealth.dev/api/badge/YOUR_SERVER_NAME)
```

## API

Base URL: `https://api.mcphealth.dev`

| Endpoint | Description |
|---|---|
| `GET /api/servers` | List all servers (search, filter, sort, paginate) |
| `GET /api/servers/:name` | Server details |
| `GET /api/servers/:name/checks` | Health check history |
| `GET /api/servers/:name/score` | Current trust score breakdown |
| `GET /api/servers/:name/score-history` | 30-day score trend |
| `GET /api/stats` | Global statistics |
| `GET /api/feed` | RSS feed |
| `GET /api/badge/:name` | SVG trust score badge |

## How Scoring Works

Each server gets a **trust score from 0 to 100**, calculated from six weighted factors:

- **Uptime** — percentage of successful health checks
- **Latency** — response time consistency
- **Schema validity** — does the server correctly declare its tools?
- **Freshness** — how recently was it checked?
- **Consistency** — stability of scores over time
- **Connectivity** — can it be reached at all?

Servers that only run locally (stdio transport) are capped at a score of 60 since they can't be remotely verified.

## Tech Stack

- **API** — [Hono](https://hono.dev) on Node.js
- **Frontend** — [Next.js 15](https://nextjs.org) with server components
- **Database** — PostgreSQL
- **Job Queue** — [pg-boss](https://github.com/timgit/pg-boss)
- **Hosting** — [Railway](https://railway.app)

## Project Structure

```
packages/
  api/      — Hono API server + health check worker
  web/      — Next.js 15 frontend
  shared/   — Shared types & constants
```

## Development

```bash
pnpm install
cp .env.example .env  # fill in DATABASE_URL
pnpm dev:api          # API on :3001
pnpm dev:web          # Frontend on :3000
```

## License

MIT
