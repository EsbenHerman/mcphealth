FROM node:22-slim AS base
RUN corepack enable

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./

# Copy packages
COPY packages/shared/ packages/shared/
COPY packages/web/ packages/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared first
RUN pnpm --filter @mcphealth/shared build

# Build Next.js
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm --filter @mcphealth/web build

# Production stage
FROM node:22-slim AS runner
WORKDIR /app

COPY --from=base /app/packages/web/.next/standalone ./
COPY --from=base /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=base /app/packages/web/public ./packages/web/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "packages/web/server.js"]
