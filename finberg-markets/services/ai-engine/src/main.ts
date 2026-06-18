// ============================================================================
// AI Engine — entrypoint
// Exposes:
//   POST /analyze            — Claude-powered chart commentary (SSE stream)
//   POST /detect/smc         — Smart Money detectors (FVG/OB/BOS/CHOCH/Sweep)
//   POST /summarize/news     — fast headline summarization
// ============================================================================

import Fastify from 'fastify';
import pino from 'pino';
import { analyzeChart } from './analyze.js';
import { detectAll } from './detectors/index.js';

const logger = pino({ level: process.env['LOG_LEVEL'] ?? 'info' });

async function main(): Promise<void> {
  const app = Fastify({ logger: false, bodyLimit: 4_000_000 });

  app.get('/healthz', () => ({ status: 'ok' }));

  app.post('/analyze', async (req, reply) => {
    const { symbol, timeframe, bars, indicators } = req.body as {
      symbol: string; timeframe: string; bars: unknown[]; indicators?: Record<string, number[]>;
    };
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    try {
      for await (const chunk of analyzeChart({ symbol, timeframe, bars, indicators })) {
        reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      reply.raw.write('event: done\ndata: {}\n\n');
    } catch (err) {
      logger.error({ err }, 'analyze failed');
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: 'failed' })}\n\n`);
    } finally {
      reply.raw.end();
    }
  });

  app.post('/detect/smc', async (req) => {
    const { bars } = req.body as { bars: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }> };
    return detectAll(bars);
  });

  const port = Number(process.env['PORT'] ?? 4040);
  await app.listen({ port, host: '0.0.0.0' });
  logger.info({ port }, 'ai-engine listening');
}

main().catch((err) => { logger.error({ err }, 'ai-engine boot failed'); process.exit(1); });
