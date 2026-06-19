import type { EventEmitter } from 'node:events';
import type { Bar, Tick, Quote, OrderBook } from '@finberg/shared/market';

export type ProviderEvent =
  | { type: 'tick'; symbol: string; payload: Tick }
  | { type: 'bar'; symbol: string; timeframe: string; payload: Bar }
  | { type: 'quote'; symbol: string; payload: Quote }
  | { type: 'book'; symbol: string; payload: OrderBook };

export interface Provider extends EventEmitter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(symbol: string): Promise<void>;
  unsubscribe(symbol: string): Promise<void>;
  fetchBars(symbol: string, timeframe: string, from: number, to: number, limit: number): Promise<Bar[]>;
}
