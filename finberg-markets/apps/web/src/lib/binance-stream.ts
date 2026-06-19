// ============================================================================
// Binance kline WebSocket stream (client-side)
//
// useBinanceLiveBars — a React hook that:
//   1. Backfills `limit` historical bars via REST
//   2. Opens wss://stream.binance.com:9443/ws/<symbol>@kline_<interval>
//   3. Updates the in-place forming bar on every kline tick
//   4. Appends a new bar when the prior one closes (`x: true`)
//   5. Auto-reconnects with exponential backoff (1s, 2s, 4s, ... capped 30s)
//   6. Cleans the socket up on symbol / timeframe change or unmount
//
// CORS / auth: Binance public streams require no API key and accept browser
// connections. The 24h forced disconnect is handled by the reconnect loop.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import type { Bar, Timeframe } from '@finberg/shared/market';
import { fetchBinanceBars } from './binance';

const WS_BASE = 'wss://stream.binance.com:9443/ws';

const INTERVAL: Partial<Record<Timeframe, string>> = {
  '1m':  '1m',  '3m':  '3m',  '5m':  '5m',
  '15m': '15m', '30m': '30m',
  '1h':  '1h',  '2h':  '2h',  '4h':  '4h',
  '1d':  '1d',  '3d':  '3d',  '1w':  '1w',  '1M':  '1M',
};

interface BinanceKlineMsg {
  e: 'kline';
  E: number;
  s: string;
  k: {
    t: number; T: number; s: string; i: string;
    o: string; c: string; h: string; l: string; v: string;
    n: number; x: boolean;
  };
}

export interface LiveBars {
  bars: Bar[];
  connected: boolean;
  lastUpdate: number | null;
  error: string | null;
}

export function useBinanceLiveBars(
  symbol: string,
  timeframe: Timeframe,
  historicalLimit = 500,
): LiveBars {
  const [bars, setBars] = useState<Bar[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep latest bars readable inside the WebSocket callback without recreating
  // the connection on every state change.
  const barsRef = useRef<Bar[]>([]);
  barsRef.current = bars;

  useEffect(() => {
    const interval = INTERVAL[timeframe];
    if (!interval) {
      setError(`Unsupported timeframe: ${timeframe}`);
      return undefined;
    }

    let cancelled = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const connect = (): void => {
      if (cancelled) return;
      const stream = `${symbol.toLowerCase()}@kline_${interval}`;
      try {
        ws = new WebSocket(`${WS_BASE}/${stream}`);
      } catch (e) {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        if (cancelled) return;
        setConnected(true);
        attempts = 0;
      };

      ws.onmessage = (evt) => {
        if (cancelled) return;
        let msg: BinanceKlineMsg;
        try { msg = JSON.parse(evt.data as string); } catch { return; }
        if (msg.e !== 'kline') return;

        const k = msg.k;
        const newBar: Bar = {
          t: k.t,
          o: Number(k.o),
          h: Number(k.h),
          l: Number(k.l),
          c: Number(k.c),
          v: Number(k.v),
          n: k.n,
        };

        const cur = barsRef.current;
        const last = cur[cur.length - 1];

        if (last && last.t === newBar.t) {
          // Update the currently-forming bar in place
          const next = cur.slice();
          next[next.length - 1] = newBar;
          setBars(next);
        } else if (!last || newBar.t > last.t) {
          // Bar closed → append the new one
          setBars([...cur, newBar]);
        }
        setLastUpdate(Date.now());
      };

      ws.onerror = () => {
        // The onclose handler runs next and will trigger reconnect.
      };

      ws.onclose = () => {
        if (cancelled) return;
        setConnected(false);
        scheduleReconnect();
      };
    };

    const scheduleReconnect = (): void => {
      const backoff = Math.min(30_000, 1_000 * 2 ** attempts++);
      reconnectTimer = setTimeout(connect, backoff);
    };

    // 1) Backfill, then 2) open the stream
    fetchBinanceBars(symbol, timeframe, historicalLimit)
      .then((data) => {
        if (cancelled) return;
        setBars(data);
        setError(null);
        setLastUpdate(Date.now());
        connect();
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'fetch failed';
        setError(`Could not load ${symbol}: ${msg}`);
      });

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        try { ws.close(); } catch { /* noop */ }
      }
    };
  }, [symbol, timeframe, historicalLimit]);

  return { bars, connected, lastUpdate, error };
}
