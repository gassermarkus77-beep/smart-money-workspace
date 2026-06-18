// ============================================================================
// Canonical constants shared across the entire stack.
// ============================================================================

export const TIMEFRAMES = [
  '1s', '5s', '15s', '30s',
  '1m', '3m', '5m', '15m', '30m',
  '1h', '2h', '4h',
  '1d', '3d', '1w', '1M',
] as const;

export type Timeframe = (typeof TIMEFRAMES)[number];

export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '1s':   1, '5s':   5, '15s':  15, '30s':  30,
  '1m':   60, '3m':  180, '5m':  300, '15m':  900, '30m': 1_800,
  '1h':   3_600, '2h':  7_200, '4h':  14_400,
  '1d':  86_400, '3d': 259_200, '1w': 604_800, '1M': 2_592_000,
};

export const ASSET_CLASSES = ['stock', 'forex', 'crypto', 'index', 'commodity', 'bond'] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export const USER_ROLES = ['guest', 'free', 'pro', 'premium', 'institutional', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PLAN_LIMITS = {
  free:          { charts: 1, watchlists: 2, watchlistSyms: 20, indicatorsPerChart: 3, alerts: 5, realtime: false },
  pro:           { charts: 4, watchlists: -1, watchlistSyms: -1, indicatorsPerChart: 25, alerts: 100, realtime: 'crypto' as const },
  premium:       { charts: 8, watchlists: -1, watchlistSyms: -1, indicatorsPerChart: -1, alerts: 500, realtime: 'all' as const, ai: true, vp: true },
  institutional: { charts: -1, sso: true, audit: true, fix: true, sla: true, seats: 5 },
} as const;
