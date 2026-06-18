# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9.12.0
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages ./packages
COPY services/market-data ./services/market-data
RUN pnpm install --frozen-lockfile --filter @finberg/market-data... \
    && pnpm --filter @finberg/market-data... build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/services/market-data/dist ./dist
COPY --from=builder /app/services/market-data/package.json ./package.json
COPY --from=builder /app/services/market-data/node_modules ./node_modules
USER app
EXPOSE 4010
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://127.0.0.1:4010/healthz || exit 1
CMD ["node", "dist/main.js"]
