// ============================================================================
// Polygon.io provider — REST bars + WebSocket trades for US equities.
// Requires POLYGON_API_KEY. See https://polygon.io/docs.
// ============================================================================

import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import type { Logger } from 'pino';
import type { Bar } from '@finberg/shared/market';
import type { Provider, ProviderEvent } from './types.js';

const WS_URL = 'wss://socket.polygon.io/stocks';
const REST   = 'https://api.polygon.io';

const TF_TO_POLYGON: Record<string, { multiplier: number; timespan: string }> = {
  '1m':  { multiplier: 1,  timespan: 'minute' },
  '5m':  { multiplier: 5,  timespan: 'minute' },
  '15m': { multiplier: 15, timespan: 'minute' },
  '30m': { multiplier: 30, timespan: 'minute' },
  '1h':  { multiplier: 1,  timespan: 'hour' },
  '1d':  { multiplier: 1,  timespan: 'day' },
  '1w':  { multiplier: 1,  timespan: 'week' },
  '1M':  { multiplier: 1,  timespan: 'month' },
};

export class PolygonProvider extends EventEmitter implements Provider {
  private ws: WebSocket | null = null;
  private subs = new Set<string>();
  private reconnectAttempts = 0;

  constructor(private readonly logger: Logger, private readonly apiKey: string) { super(); }

  async connect(): Promise<void> { return this.openSocket(); }

  async disconnect(): Promise<void> { this.ws?.close(); this.ws = null; }

  async subscribe(symbol: string): Promise<void> {
    const ch = `T.${symbol.toUpperCase()}`;
    if (this.subs.has(ch)) return;
    this.subs.add(ch);
    this.send({ action: 'subscribe', params: ch });
  }

  async unsubscribe(symbol: string): Promise<void> {
    const ch = `T.${symbol.toUpperCase()}`;
    this.subs.delete(ch);
    this.send({ action: 'unsubscribe', params: ch });
  }

  async fetchBars(symbol: string, timeframe: string, from: number, to: number, limit: number): Promise<Bar[]> {
    const tf = TF_TO_POLYGON[timeframe];
    if (!tf) return [];
    const url = `${REST}/v2/aggs/ticker/${symbol.toUpperCase()}/range/${tf.multiplier}/${tf.timespan}/${from}/${to}?limit=${limit}&adjusted=true&apiKey=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`polygon aggs ${res.status}`);
    const json = (await res.json()) as { results?: Array<{ t: number; o: number; h: number; l: number; c: number; v: number; n?: number; vw?: number }> };
    return (json.results ?? []).map(b => ({
      t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v, n: b.n,
      ...(b.vw !== undefined ? { vwap: b.vw } : {}),
    }));
  }

  // -----------------------------------------------------------------------

  private openSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL);
      this.ws.on('open', () => {
        this.send({ action: 'auth', params: this.apiKey });
        if (this.subs.size > 0) this.send({ action: 'subscribe', params: [...this.subs].join(',') });
        this.reconnectAttempts = 0;
        resolve();
      });
      this.ws.on('message', (raw) => this.handleMessage(raw.toString()));
      this.ws.on('close', () => this.scheduleReconnect());
      this.ws.on('error', (err) => { this.logger.error({ err }, 'polygon ws error'); reject(err); });
    });
  }

  private scheduleReconnect(): void {
    const backoff = Math.min(30_000, 1_000 * 2 ** this.reconnectAttempts++);
    setTimeout(() => this.openSocket().catch(() => this.scheduleReconnect()), backoff);
  }

  private send(msg: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private handleMessage(text: string): void {
    let arr: Array<{ ev?: string; sym?: string; t?: number; p?: number; s?: number }>;
    try { arr = JSON.parse(text); } catch { return; }
    for (const m of arr) {
      if (m.ev === 'T' && m.sym) {
        const ev: ProviderEvent = {
          type: 'tick',
          symbol: m.sym,
          payload: { t: m.t ?? Date.now(), p: m.p ?? 0, s: m.s ?? 0 },
        };
        this.emit('event', ev);
      }
    }
  }
}
