// ============================================================================
// FINBERG SMC AI — Entrypoint
// ============================================================================

import Fastify from 'fastify';
import pino from 'pino';
import { registerRoutes } from './api/routes.js';

const logger = pino({ level: process.env['LOG_LEVEL'] ?? 'info' });

async function main(): Promise<void> {
  const app = Fastify({ logger: false, bodyLimit: 8_000_000 });
  await registerRoutes(app, logger);

  const port = Number(process.env['PORT'] ?? 4050);
  await app.listen({ port, host: '0.0.0.0' });
  logger.info({ port }, 'smc-ai listening');
}

main().catch(err => { logger.error({ err }, 'smc-ai boot failed'); process.exit(1); });
