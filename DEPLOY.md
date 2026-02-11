# MCPHealth — Railway Deployment

## Architecture
- **mcphealth-api** — Hono API + pg-boss worker (port 3001)
- **mcphealth-web** — Next.js frontend (port 3000)
- **Postgres** — Railway-managed (already provisioned)

## Prerequisites
1. Railway CLI: `npm i -g @railway/cli` (or download from GitHub releases)
2. Login: `railway login`

## Deploy

### 1. Link project
```bash
railway link --project 9e92525a-5477-49d8-8c73-7f3dead6dac7 --environment caf0647f-2263-4979-b839-15e71151d5d5
```

### 2. Deploy API service
```bash
# Create service (first time only)
railway service create mcphealth-api
railway link --service mcphealth-api

# Set env vars
railway variables set DATABASE_URL='${{Postgres.DATABASE_URL}}' NODE_ENV=production PORT=3001

# Deploy
railway up --dockerfile Dockerfile.api --detach
```

### 3. Get API domain
After API deploys, go to Railway dashboard → mcphealth-api → Settings → Generate Domain.
Note the URL (e.g., `https://mcphealth-api-production.up.railway.app`).

### 4. Deploy Web service
```bash
railway service create mcphealth-web
railway link --service mcphealth-web

# Set env vars (use the API domain from step 3)
railway variables set NEXT_PUBLIC_API_URL=https://mcphealth-api-production.up.railway.app NODE_ENV=production PORT=3000

# Deploy
railway up --dockerfile Dockerfile.web --detach
```

### 5. Custom domain (optional)
- Railway dashboard → mcphealth-web → Settings → Custom Domain → `mcphealth.dev`
- Add CNAME record: `mcphealth.dev` → Railway-provided target

## GitHub Auto-Deploy (Alternative)
Connect repo in Railway dashboard → each service watches for pushes and auto-deploys using its configured Dockerfile.
