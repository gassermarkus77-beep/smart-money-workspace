// ============================================================================
// Binance public REST adapter (client-side, no API key required)
//
// Used for the demo deploy on Vercel where the dedicated market-data service
// isn't running. Binance allows CORS from any origin for its public endpoints,
// so the browser can hit it directly.
//
// Endpoint: GET https://api.binance.com/api/v3/klines
// Docs:     https://developers.binance.com/docs/binance-spot-api-docs/rest-api#klinecandlestick-data
// Limits:   1200 weight per minute per IP; one /klines call = 1-2 weight.
// ============================================================================

import type { Bar, Timeframe } from '@finberg/shared/market';

const REST = 'https://api.binance.com/api/v3';

/** Map our internal timeframe codes to Binance's interval strings. */
const INTERVAL: Partial<Record<Timeframe, string>> = {
  '1m':  '1m',
  '3m':  '3m',
  '5m':  '5m',
  '15m': '15m',
  '30m': '30m',
  '1h':  '1h',
  '2h':  '2h',
  '4h':  '4h',
  '1d':  '1d',
  '3d':  '3d',
  '1w':  '1w',
  '1M':  '1M',
};

/**
 * Fetch the last `limit` klines for a symbol/timeframe.
 * Returns bars sorted ascending by time. Throws on network or HTTP error.
 */
export async function fetchBinanceBars(
  symbol: string,
  timeframe: Timeframe,
  limit = 500,
): Promise<Bar[]> {
  const interval = INTERVAL[timeframe];
  if (!interval) throw new Error(`Unsupported timeframe for Binance: ${timeframe}`);

  const url = `${REST}/klines?symbol=${encodeURIComponent(symbol.toUpperCase())}&interval=${interval}&limit=${Math.min(limit, 1000)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance ${res.status}: ${res.statusText}`);

  // Binance returns: [openTime, open, high, low, close, volume, closeTime, quoteVol, trades, ...]
  const raw = (await res.json()) as Array<
    [number, string, string, string, string, string, number, string, number, ...unknown[]]
  >;

  return raw.map((k): Bar => ({
    t: k[0],
    o: Number(k[1]),
    h: Number(k[2]),
    l: Number(k[3]),
    c: Number(k[4]),
    v: Number(k[5]),
    n: k[8],
  }));
}

/**
 * Light symbol-search fallback. Binance has an /exchangeInfo endpoint but it
 * returns 4000+ pairs (large payload). For a search UX we filter the local
 * top-symbols list — enough for the demo. Swap with a server-side index later.
 */
export const POPULAR_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
  'TRXUSDT', 'MATICUSDT', 'LTCUSDT', 'NEARUSDT', 'TONUSDT',
  'SUIUSDT', 'APTUSDT', 'ATOMUSDT', 'ARBUSDT', 'OPUSDT',
];
