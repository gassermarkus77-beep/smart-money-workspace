// ============================================================================
// Binance provider — public WebSocket + REST.
// Streams trade ticks via wss://stream.binance.com:9443; backfills bars via
// REST. Implements exponential reconnect.
// ============================================================================

import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import type { Logger } from 'pino';
import type { Bar } from '@finberg/shared/market';
import type { Provider, ProviderEvent } from './types.js';

const WS_BASE   = 'wss://stream.binance.com:9443/ws';
const REST_BASE = 'https://api.binance.com/api/v3';

const TF_TO_BINANCE: Record<string, string> = {
  '1m':'1m','3m':'3m','5m':'5m','15m':'15m','30m':'30m',
  '1h':'1h','2h':'2h','4h':'4h','1d':'1d','1w':'1w','1M':'1M',
};

export class BinanceProvider extends EventEmitter implements Provider {
  private ws: WebSocket | null = null;
  private subs = new Set<string>();           // lowercased streams, e.g. "btcusdt@trade"
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(private readonly logger: Logger) { super(); }

  async connect(): Promise<void> {
    return this.openSocket();
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  async subscribe(symbol: string): Promise<void> {
    const stream = `${symbol.toLowerCase()}@trade`;
    if (this.subs.has(stream)) return;
    this.subs.add(stream);
    this.send({ method: 'SUBSCRIBE', params: [stream], id: Date.now() });
  }

  async unsubscribe(symbol: string): Promise<void> {
    const stream = `${symbol.toLowerCase()}@trade`;
    this.subs.delete(stream);
    this.send({ method: 'UNSUBSCRIBE', params: [stream], id: Date.now() });
  }

  async fetchBars(symbol: string, timeframe: string, from: number, to: number, limit: number): Promise<Bar[]> {
    const interval = TF_TO_BINANCE[timeframe];
    if (!interval) return [];
    const url = `${REST_BASE}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&startTime=${from}&endTime=${to}&limit=${Math.min(limit, 1000)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`binance klines ${res.status}`);
    const raw = (await res.json()) as Array<[number,string,string,string,string,string,number,string,number,string,string,string]>;
    return raw.map(k => ({
      t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5], n: k[8],
    }));
  }

  // -----------------------------------------------------------------------

  private openSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_BASE);

      this.ws.on('open', () => {
        this.reconnectAttempts = 0;
        this.logger.info('binance ws open');
        // Re-subscribe everything after reconnect
        if (this.subs.size > 0) {
          this.send({ method: 'SUBSCRIBE', params: [...this.subs], id: Date.now() });
        }
        resolve();
      });

      this.ws.on('message', (raw) => this.handleMessage(raw.toString()));

      this.ws.on('close', () => {
        this.logger.warn('binance ws closed, will reconnect');
        this.scheduleReconnect();
      });

      this.ws.on('error', (err) => {
        this.logger.error({ err }, 'binance ws error');
        reject(err);
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const backoff = Math.min(30_000, 1_000 * 2 ** this.reconnectAttempts++);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket().catch(() => this.scheduleReconnect());
    }, backoff);
  }

  private send(msg: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private handleMessage(text: string): void {
    let obj: { e?: string; s?: string; T?: number; p?: string; q?: string; m?: boolean };
    try { obj = JSON.parse(text); } catch { return; }
    if (obj.e === 'trade' && obj.s) {
      const ev: ProviderEvent = {
        type: 'tick',
        symbol: obj.s,
        payload: {
          t: obj.T ?? Date.now(),
          p: Number(obj.p),
          s: Number(obj.q),
          side: obj.m ? 'S' : 'B',
        },
      };
      this.emit('event', ev);
    }
  }
}
