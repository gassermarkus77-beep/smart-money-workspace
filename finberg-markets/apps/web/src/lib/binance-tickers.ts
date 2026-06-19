// ============================================================================
// Binance 24h ticker stream — live last price + change for many symbols at once
//
// Combined stream:
//   wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker
// Each message arrives wrapped as `{ stream, data: <ticker> }` where the
// ticker payload has `c` (last), `p` (24h price change), `P` (24h % change).
// ============================================================================

import { useEffect, useState } from 'react';

const WS_BASE = 'wss://stream.binance.com:9443/stream';

export interface Ticker {
  symbol: string;
  last: number;
  change: number;       // 24h change in quote currency
  changePct: number;    // 24h percentage change
}

interface BinanceTickerData {
  s: string;            // symbol
  c: string;            // last price
  p: string;            // 24h price change
  P: string;            // 24h percent change
}

export function useBinanceTickers(symbols: string[]): Record<string, Ticker> {
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});

  useEffect(() => {
    if (symbols.length === 0) return undefined;

    let cancelled = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const streams = symbols.map(s => `${s.toLowerCase()}@ticker`).join('/');
    const url = `${WS_BASE}?streams=${streams}`;

    const connect = (): void => {
      if (cancelled) return;
      try { ws = new WebSocket(url); } catch { scheduleReconnect(); return; }

      ws.onopen = () => { attempts = 0; };
      ws.onmessage = (evt) => {
        if (cancelled) return;
        let payload: { stream: string; data: BinanceTickerData };
        try { payload = JSON.parse(evt.data as string); } catch { return; }
        const d = payload.data;
        if (!d?.s) return;
        setTickers(prev => ({
          ...prev,
          [d.s]: {
            symbol:    d.s,
            last:      Number(d.c),
            change:    Number(d.p),
            changePct: Number(d.P),
          },
        }));
      };
      ws.onclose = () => { if (!cancelled) scheduleReconnect(); };
      ws.onerror = () => { /* onclose handles reconnect */ };
    };

    const scheduleReconnect = (): void => {
      const backoff = Math.min(30_000, 1_000 * 2 ** attempts++);
      reconnectTimer = setTimeout(connect, backoff);
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null; ws.onmessage = null; ws.onerror = null;
        try { ws.close(); } catch { /* noop */ }
      }
    };
  // Re-subscribe when the set of symbols changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(',')]);

  return tickers;
}
