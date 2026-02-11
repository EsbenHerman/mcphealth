#!/bin/bash
# Deploy MCPHealth to Railway
# Prerequisites: railway CLI authenticated (run `railway login` first)
# 
# Usage: ./scripts/deploy.sh

set -euo pipefail

PROJECT_ID="9e92525a-5477-49d8-8c73-7f3dead6dac7"
ENV_ID="caf0647f-2263-4979-b839-15e71151d5d5"

echo "=== MCPHealth Railway Deployment ==="
echo ""

# Check railway auth
railway whoami || { echo "Please run 'railway login' first"; exit 1; }

# Link to project
railway link --project "$PROJECT_ID" --environment "$ENV_ID"

echo ""
echo "=== Creating API service ==="
railway service create mcphealth-api 2>/dev/null || echo "Service may already exist"

echo ""
echo "=== Creating Web service ==="  
railway service create mcphealth-web 2>/dev/null || echo "Service may already exist"

echo ""
echo "=== Setting env vars for API service ==="
echo "Select the mcphealth-api service when prompted"
railway service mcphealth-api
railway variables set DATABASE_URL='$DATABASE_URL' PORT=3001 NODE_ENV=production

echo ""
echo "=== Setting env vars for Web service ==="
railway service mcphealth-web  
railway variables set PORT=3000 NODE_ENV=production HOSTNAME=0.0.0.0

echo ""
echo "=== Deploying API ==="
railway service mcphealth-api
railway up --detach

echo ""
echo "=== Deploying Web ==="
railway service mcphealth-web
railway up --detach

echo ""
echo "=== Setting up domains ==="
railway service mcphealth-api
railway domain
railway service mcphealth-web
railway domain

echo ""
echo "=== Done! ==="
echo "Check status at https://railway.com/project/$PROJECT_ID"
