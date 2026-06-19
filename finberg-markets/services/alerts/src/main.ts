// ============================================================================
// Alerts Service — entrypoint
// - Loads active alerts from Postgres
// - Subscribes to tick stream (via NATS subject `ticks.*`)
// - Evaluates each alert per-tick with the appropriate evaluator
// - On fire, publishes to `notifications.dispatch` with idempotency key
// ============================================================================

import Fastify from 'fastify';
import { connect, type NatsConnection, StringCodec } from 'nats';
import pino from 'pino';
import { evaluatePrice } from './evaluators/price.js';

const logger = pino({ level: process.env['LOG_LEVEL'] ?? 'info' });
const sc = StringCodec();

interface ActiveAlert {
  id: string;
  userId: string;
  symbol: string;
  type: 'price';
  condition: { kind: 'cross' | 'above' | 'below'; value: number };
  lastFiredAt: number | null;
  cooldownMs: number;
  fireCount: number;
  triggerMode: 'once' | 'every_time' | 'once_per_bar';
}

async function main(): Promise<void> {
  const app = Fastify({ logger: false });
  app.get('/healthz', () => ({ status: 'ok' }));

  const nc: NatsConnection = await connect({ servers: process.env['NATS_URL'] ?? 'nats://localhost:4222' });
  logger.info('alerts: connected to NATS');

  // TODO: load from Postgres on boot + on `alerts.changed` event
  const alerts: Map<string, ActiveAlert> = new Map();

  const subTicks = nc.subscribe('ticks.>');
  (async () => {
    for await (const msg of subTicks) {
      const symbol = msg.subject.slice('ticks.'.length).toUpperCase();
      let tick: { t: number; p: number; s: number };
      try { tick = JSON.parse(sc.decode(msg.data)); } catch { continue; }

      for (const a of alerts.values()) {
        if (a.symbol !== symbol || a.type !== 'price') continue;

        // Last-price reference for cross detection lives in Redis per-alert;
        // omitted here for brevity.
        const fired = evaluatePrice(a.condition, tick.p, undefined);
        if (!fired) continue;

        const now = Date.now();
        if (a.lastFiredAt && now - a.lastFiredAt < a.cooldownMs) continue;
        if (a.triggerMode === 'once' && a.fireCount >= 1) continue;

        a.lastFiredAt = now;
        a.fireCount++;

        nc.publish('notifications.dispatch', sc.encode(JSON.stringify({
          idempotencyKey: `${a.id}:${tick.t}`,
          userId: a.userId,
          template: 'alert.fired',
          payload: { alertId: a.id, symbol, price: tick.p, ts: tick.t },
        })));
      }
    }
  })().catch((err) => logger.error({ err }, 'tick consumer crashed'));

  const port = Number(process.env['PORT'] ?? 4030);
  await app.listen({ port, host: '0.0.0.0' });
  logger.info({ port }, 'alerts listening');
}

main().catch((err) => { logger.error({ err }, 'alerts boot failed'); process.exit(1); });
