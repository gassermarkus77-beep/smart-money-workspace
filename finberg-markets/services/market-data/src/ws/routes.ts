// ============================================================================
// WebSocket multiplexer — one /ws endpoint, JSON envelope.
// Clients send {type:"subscribe", channel:"tick", symbols:["BTCUSDT",...]}
// Server replies with {type:"tick", symbol, tick:{...}} as upstream events
// arrive. Heartbeat ping every 25s; idle disconnect at 60s.
// ============================================================================

import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';
import { randomUUID } from 'node:crypto';
import { WsEnvelopeSchema, type AssetClass } from '@finberg/shared/market';
import type { Router } from '../router/router.js';

export async function registerWsRoutes(app: FastifyInstance, router: Router, logger: Logger): Promise<void> {
  app.get('/ws', { websocket: true }, (socket /* SocketStream */, _req) => {
    const id = randomUUID();
    const subs = new Map<string, () => void>();      // symbol → unsubscribe fn
    let alive = true;

    const send = (msg: unknown): void => {
      if (socket.readyState === 1) socket.send(JSON.stringify(msg));
    };

    const heartbeat = setInterval(() => {
      if (!alive) { socket.close(1000, 'idle'); return; }
      alive = false;
      send({ type: 'ping' });
    }, 25_000);

    socket.on('message', async (raw: Buffer) => {
      alive = true;
      let parsed;
      try { parsed = JSON.parse(raw.toString()); }
      catch { send({ type: 'error', code: 'bad_json', message: 'invalid JSON' }); return; }

      const result = WsEnvelopeSchema.safeParse(parsed);
      if (!result.success) {
        send({ type: 'error', code: 'bad_envelope', message: 'envelope failed validation' });
        return;
      }
      const env = result.data;

      switch (env.type) {
        case 'subscribe': {
          for (const sym of env.symbols) {
            if (subs.has(sym)) continue;
            const asset = inferAssetClass(sym);
            const off = router.onSymbol(sym, (e) => send({ ...e, symbol: sym, tick: e.payload }));
            subs.set(sym, off);
            await router.subscribe(sym, asset, id);
          }
          break;
        }
        case 'unsubscribe': {
          for (const sym of env.symbols) {
            const off = subs.get(sym);
            if (off) { off(); subs.delete(sym); }
            const asset = inferAssetClass(sym);
            await router.unsubscribe(sym, asset, id);
          }
          break;
        }
        case 'pong':
          break;
        default:
          send({ type: 'error', code: 'unsupported', message: `${env.type} not supported from client` });
      }
    });

    socket.on('close', async () => {
      clearInterval(heartbeat);
      for (const [sym, off] of subs) {
        off();
        await router.unsubscribe(sym, inferAssetClass(sym), id);
      }
      logger.debug({ id }, 'ws client disconnected');
    });
  });
}

function inferAssetClass(symbol: string): AssetClass {
  // Heuristic: ends in USDT/USDC/BTC/ETH → crypto. Else equity.
  if (/USDT$|USDC$|BTC$|ETH$|BUSD$/.test(symbol)) return 'crypto';
  return 'stock';
}
