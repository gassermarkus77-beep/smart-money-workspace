// ============================================================================
// Provider Router
// - Maintains one upstream connection per (provider, asset class)
// - Routes per-symbol subscriptions to the cheapest healthy provider
// - Emits normalized Tick/Bar/Quote events for downstream consumers
// ============================================================================

import { EventEmitter } from 'node:events';
import type { Logger } from 'pino';
import type { AssetClass, Bar, Tick } from '@finberg/shared/market';
import { BinanceProvider } from '../providers/binance.js';
import { PolygonProvider } from '../providers/polygon.js';
import type { Provider, ProviderEvent } from '../providers/types.js';

export class Router extends EventEmitter {
  private providers: Map<string, Provider> = new Map();
  /** symbol → set of subscribers (callback ids) */
  private subscribers: Map<string, Set<string>> = new Map();

  constructor(private readonly logger: Logger) {
    super();
    this.setMaxListeners(0);
  }

  async start(): Promise<void> {
    if (process.env['BINANCE_ENABLED'] !== 'false') {
      this.providers.set('binance', new BinanceProvider(this.logger));
    }
    if (process.env['POLYGON_API_KEY']) {
      this.providers.set('polygon', new PolygonProvider(this.logger, process.env['POLYGON_API_KEY']!));
    }

    for (const [name, p] of this.providers) {
      p.on('event', (e: ProviderEvent) => this.emit(`event:${e.symbol}`, e));
      try {
        await p.connect();
        this.logger.info({ provider: name }, 'provider connected');
      } catch (err) {
        this.logger.error({ provider: name, err }, 'provider failed to connect');
      }
    }
  }

  /** Pick the best provider for (symbol, asset class). Cost-aware in v1. */
  private selectProvider(symbol: string, assetClass: AssetClass): Provider | null {
    if (assetClass === 'crypto') return this.providers.get('binance') ?? null;
    if (assetClass === 'stock')  return this.providers.get('polygon') ?? null;
    return this.providers.get('polygon') ?? this.providers.get('binance') ?? null;
  }

  async subscribe(symbol: string, assetClass: AssetClass, subscriberId: string): Promise<void> {
    const set = this.subscribers.get(symbol) ?? new Set<string>();
    set.add(subscriberId);
    this.subscribers.set(symbol, set);

    // First subscriber → open upstream subscription
    if (set.size === 1) {
      const provider = this.selectProvider(symbol, assetClass);
      if (!provider) {
        this.logger.warn({ symbol, assetClass }, 'no provider for symbol');
        return;
      }
      await provider.subscribe(symbol);
    }
  }

  async unsubscribe(symbol: string, assetClass: AssetClass, subscriberId: string): Promise<void> {
    const set = this.subscribers.get(symbol);
    if (!set) return;
    set.delete(subscriberId);
    if (set.size === 0) {
      this.subscribers.delete(symbol);
      const provider = this.selectProvider(symbol, assetClass);
      await provider?.unsubscribe(symbol);
    }
  }

  async backfillBars(symbol: string, assetClass: AssetClass, timeframe: string, from: number, to: number, limit: number): Promise<Bar[]> {
    const provider = this.selectProvider(symbol, assetClass);
    if (!provider) return [];
    return provider.fetchBars(symbol, timeframe, from, to, limit);
  }

  onSymbol(symbol: string, listener: (e: ProviderEvent) => void): () => void {
    const evt = `event:${symbol}`;
    this.on(evt, listener);
    return () => this.off(evt, listener);
  }

  /** Reference: re-emit a tick (used by tests and the in-memory mock provider). */
  emitTick(symbol: string, tick: Tick): void {
    this.emit(`event:${symbol}`, { type: 'tick', symbol, payload: tick });
  }
}
