// ============================================================================
// Canonical market-data types — used by every service and the chart engine.
// ============================================================================

import { z } from 'zod';
import { ASSET_CLASSES, TIMEFRAMES, type AssetClass, type Timeframe } from './constants';

// ----- Instrument ----------------------------------------------------------
export const InstrumentSchema = z.object({
  id: z.string().uuid(),
  symbol: z.string().min(1).max(32),
  exchange: z.string().min(1).max(32),
  assetClass: z.enum(ASSET_CLASSES),
  quoteCurrency: z.string().length(3).optional(),
  name: z.string().optional(),
  sector: z.string().optional(),
  industry: z.string().optional(),
  country: z.string().length(2).optional(),
  tickSize: z.number().positive(),
  lotSize: z.number().positive(),
  isActive: z.boolean().default(true),
});
export type Instrument = z.infer<typeof InstrumentSchema>;

// ----- Bar (OHLCV) ---------------------------------------------------------
export const BarSchema = z.object({
  t: z.number().int(),                // epoch ms (UTC)
  o: z.number(),
  h: z.number(),
  l: z.number(),
  c: z.number(),
  v: z.number().nonnegative(),
  n: z.number().int().nonnegative().optional(), // trade count
  vwap: z.number().positive().optional(),
});
export type Bar = z.infer<typeof BarSchema>;

// ----- Tick (last trade) ---------------------------------------------------
export const TickSchema = z.object({
  t: z.number().int(),                // epoch ms
  p: z.number().positive(),
  s: z.number().nonnegative(),
  side: z.enum(['B', 'S', 'U']).optional(),
});
export type Tick = z.infer<typeof TickSchema>;

// ----- Quote (L1) ----------------------------------------------------------
export const QuoteSchema = z.object({
  t: z.number().int(),
  bid: z.number().positive(),
  bidSize: z.number().nonnegative(),
  ask: z.number().positive(),
  askSize: z.number().nonnegative(),
});
export type Quote = z.infer<typeof QuoteSchema>;

// ----- L2 Order book level -------------------------------------------------
export const OrderBookLevelSchema = z.tuple([z.number(), z.number()]);  // [price, size]
export const OrderBookSchema = z.object({
  t: z.number().int(),
  bids: z.array(OrderBookLevelSchema),
  asks: z.array(OrderBookLevelSchema),
  sequence: z.number().int().optional(),
});
export type OrderBook = z.infer<typeof OrderBookSchema>;

// ----- WebSocket envelope --------------------------------------------------
export const WsEnvelopeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('subscribe'),   channel: z.string(), symbols: z.array(z.string()) }),
  z.object({ type: z.literal('unsubscribe'), channel: z.string(), symbols: z.array(z.string()) }),
  z.object({ type: z.literal('bar'),         symbol: z.string(), tf: z.enum(TIMEFRAMES), bar: BarSchema }),
  z.object({ type: z.literal('tick'),        symbol: z.string(), tick: TickSchema }),
  z.object({ type: z.literal('quote'),       symbol: z.string(), quote: QuoteSchema }),
  z.object({ type: z.literal('book'),        symbol: z.string(), book: OrderBookSchema }),
  z.object({ type: z.literal('ping') }),
  z.object({ type: z.literal('pong') }),
  z.object({ type: z.literal('error'),       code: z.string(), message: z.string() }),
]);
export type WsEnvelope = z.infer<typeof WsEnvelopeSchema>;

// ----- Historical range request -------------------------------------------
export const BarRangeRequestSchema = z.object({
  symbol: z.string(),
  exchange: z.string().optional(),
  timeframe: z.enum(TIMEFRAMES),
  from: z.number().int(),
  to: z.number().int(),
  limit: z.number().int().min(1).max(5000).default(1000),
});
export type BarRangeRequest = z.infer<typeof BarRangeRequestSchema>;

// ----- Re-exports ----------------------------------------------------------
export type { Timeframe, AssetClass };
