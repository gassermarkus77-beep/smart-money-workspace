import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';
import { BarRangeRequestSchema } from '@finberg/shared/market';
import type { Router } from './router/router.js';

export async function registerBarRoutes(app: FastifyInstance, router: Router, logger: Logger): Promise<void> {
  app.get('/bars', async (req, reply) => {
    const parsed = BarRangeRequestSchema.safeParse(req.query);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'validation_failed', details: parsed.error.flatten() };
    }
    try {
      const { symbol, timeframe, from, to, limit } = parsed.data;
      const assetClass = /USDT$|USDC$|BTC$/.test(symbol) ? 'crypto' : 'stock';
      const bars = await router.backfillBars(symbol, assetClass, timeframe, from, to, limit);
      return bars;
    } catch (err) {
      logger.error({ err }, 'bar backfill failed');
      reply.code(502);
      return { error: 'upstream_failed' };
    }
  });
}
