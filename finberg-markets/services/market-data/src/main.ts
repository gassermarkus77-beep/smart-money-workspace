// ============================================================================
// Market Data Service — entrypoint
// Boots Fastify with the WebSocket multiplexer and REST endpoints for bar
// backfill. Subscribes to upstream provider feeds via the Router.
// ============================================================================

import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import pino from 'pino';
import { Router } from './router/router.js';
import { registerWsRoutes } from './ws/routes.js';
import { registerBarRoutes } from './bars.js';

const logger = pino({ level: process.env['LOG_LEVEL'] ?? 'info' });

async function main(): Promise<void> {
  const app = Fastify({ logger: false, bodyLimit: 1_000_000, trustProxy: true });
  await app.register(websocket, { options: { maxPayload: 1_048_576 } });

  const router = new Router(logger);
  await router.start();

  await registerWsRoutes(app, router, logger);
  await registerBarRoutes(app, router, logger);

  app.get('/healthz', () => ({ status: 'ok' }));

  const port = Number(process.env['PORT'] ?? 4010);
  await app.listen({ port, host: '0.0.0.0' });
  logger.info({ port }, 'market-data listening');
}

main().catch((err) => {
  logger.error({ err }, 'market-data failed to start');
  process.exit(1);
});
