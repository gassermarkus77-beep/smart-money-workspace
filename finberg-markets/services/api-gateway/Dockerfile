# syntax=docker/dockerfile:1.7
# ----- Build stage -----
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9.12.0
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages ./packages
COPY services/api-gateway ./services/api-gateway
RUN pnpm install --frozen-lockfile --filter @finberg/api-gateway... \
    && pnpm --filter @finberg/api-gateway... build

# ----- Runtime stage -----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/services/api-gateway/dist ./dist
COPY --from=builder /app/services/api-gateway/package.json ./package.json
COPY --from=builder /app/services/api-gateway/node_modules ./node_modules
USER app
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/v1/healthz || exit 1
CMD ["node", "dist/main.js"]
