// ============================================================================
// MarketService — gateway-side proxy to the dedicated market-data service.
// For dev / demos, generates plausible synthetic bars so the chart engine
// has data to render before the full data pipeline is wired up.
// ============================================================================

import { Injectable } from '@nestjs/common';
import { TIMEFRAME_SECONDS, type Bar, type BarRangeRequest } from '@finberg/shared';

@Injectable()
export class MarketService {
  async getBars(req: BarRangeRequest): Promise<Bar[]> {
    // TODO: replace with gRPC call to services/market-data
    const stepMs = TIMEFRAME_SECONDS[req.timeframe] * 1000;
    const bars: Bar[] = [];
    let t = req.from - (req.from % stepMs);
    let price = 100 + (hashCode(req.symbol) % 1000);
    while (t <= req.to && bars.length < req.limit) {
      const o = price;
      const drift = (Math.random() - 0.5) * o * 0.01;
      const c = Math.max(0.01, o + drift);
      const h = Math.max(o, c) + Math.random() * o * 0.005;
      const l = Math.min(o, c) - Math.random() * o * 0.005;
      const v = Math.round(1000 + Math.random() * 5000);
      bars.push({ t, o, h, l, c, v });
      price = c;
      t += stepMs;
    }
    return bars;
  }

  async search(q: string): Promise<Array<{ symbol: string; name: string; exchange: string; assetClass: string }>> {
    // TODO: query instruments table
    const seed = (q ?? '').toUpperCase();
    return [
      { symbol: `${seed}USD`, name: `${seed} Demo Pair`, exchange: 'FINBERG', assetClass: 'crypto' },
      { symbol: seed,         name: `${seed} Inc.`,        exchange: 'NASDAQ',  assetClass: 'stock' },
    ];
  }
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
