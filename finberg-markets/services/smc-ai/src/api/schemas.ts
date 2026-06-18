// ============================================================================
// Zod schemas shared by the HTTP routes.
// ============================================================================

import { z } from 'zod';
import { TIMEFRAMES, ASSET_CLASSES } from '@finberg/shared';

const BarSchema = z.object({
  t: z.number().int(),
  o: z.number(),
  h: z.number(),
  l: z.number(),
  c: z.number(),
  v: z.number().nonnegative(),
});

export const AnalyzeRequestSchema = z.object({
  symbol: z.string().min(1),
  assetClass: z.enum(ASSET_CLASSES),
  /** Bars keyed by timeframe — at minimum the entry TF + each declared HTF. */
  bars: z.record(z.enum(TIMEFRAMES), z.array(BarSchema)),
  entryTimeframe: z.enum(TIMEFRAMES),
  htfTimeframes: z.array(z.enum(TIMEFRAMES)).min(1),
  timezone: z.string().default('UTC'),
  upgradeCommentary: z.boolean().default(false),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const DetectRequestSchema = z.object({
  symbol: z.string().min(1),
  timeframe: z.enum(TIMEFRAMES),
  bars: z.array(BarSchema),
  timezone: z.string().default('UTC'),
});
export type DetectRequest = z.infer<typeof DetectRequestSchema>;

export const BacktestRequestSchema = z.object({
  symbol: z.string().min(1),
  assetClass: z.enum(ASSET_CLASSES),
  bars: z.record(z.enum(TIMEFRAMES), z.array(BarSchema)),
  entryTimeframe: z.enum(TIMEFRAMES),
  htfTimeframes: z.array(z.enum(TIMEFRAMES)).min(1),
  startAtBar: z.number().int().nonnegative().optional(),
  cooldownBars: z.number().int().nonnegative().optional(),
});
export type BacktestRequest = z.infer<typeof BacktestRequestSchema>;
