FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9 --activate

FROM base AS build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY packages/api/ packages/api/

RUN pnpm --filter @mcphealth/shared build
RUN pnpm --filter @mcphealth/api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=build /app/packages/shared/package.json packages/shared/
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/api/package.json packages/api/
COPY --from=build /app/packages/api/dist packages/api/dist
COPY --from=build /app/packages/api/src/migrate.ts packages/api/src/migrate.ts
COPY --from=build /app/packages/api/migrations packages/api/migrations

RUN pnpm install --frozen-lockfile --prod

EXPOSE 3001
ENV PORT=3001
CMD ["node", "packages/api/dist/index.js"]
