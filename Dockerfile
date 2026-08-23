# Multi-stage build for SvelteKit with adapter-node (see kitchen-bitchin)
FROM node:24-slim AS base
RUN corepack enable && corepack prepare pnpm@11.16.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
	adduser --system --uid 1001 sveltekit
USER sveltekit

COPY --from=builder --chown=sveltekit:nodejs /app/build ./build
COPY --from=builder --chown=sveltekit:nodejs /app/server.js ./
COPY --from=builder --chown=sveltekit:nodejs /app/cross-origin-isolation-headers.ts ./
COPY --from=builder --chown=sveltekit:nodejs /app/package.json ./
COPY --from=deps --chown=sveltekit:nodejs /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
CMD ["node", "--experimental-strip-types", "server.js"]
