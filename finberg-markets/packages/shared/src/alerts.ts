import { z } from 'zod';
import { TIMEFRAMES } from './constants';

export const ChannelSchema = z.enum([
  'in_app', 'email', 'push', 'telegram', 'slack', 'discord', 'webhook', 'sms',
]);
export type Channel = z.infer<typeof ChannelSchema>;

export const PriceConditionSchema = z.object({
  kind: z.enum(['cross', 'above', 'below', 'enters_range', 'exits_range']),
  value: z.number(),
  value2: z.number().optional(),     // for range conditions
});

export const VolumeConditionSchema = z.object({
  kind: z.enum(['absolute_above', 'relative_above']),
  value: z.number().positive(),
  lookbackBars: z.number().int().min(1).default(20),
});

export const IndicatorConditionSchema = z.object({
  indicatorKey: z.string(),          // 'rsi','macd','script:abc'
  inputs: z.record(z.unknown()).default({}),
  expression: z.string(),            // 'rsi > 70', 'macd.hist > 0 and rsi < 30'
});

export const AlertSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  instrumentId: z.string().uuid(),
  name: z.string().optional(),
  timeframe: z.enum(TIMEFRAMES).optional(),
  condition: z.discriminatedUnion('type', [
    z.object({ type: z.literal('price'),     payload: PriceConditionSchema }),
    z.object({ type: z.literal('volume'),    payload: VolumeConditionSchema }),
    z.object({ type: z.literal('indicator'), payload: IndicatorConditionSchema }),
    z.object({ type: z.literal('drawing'),   payload: z.object({ drawingId: z.string().uuid(), event: z.enum(['break','touch']) }) }),
    z.object({ type: z.literal('news'),      payload: z.object({ keywords: z.array(z.string()), sentiment: z.enum(['any','pos','neg']).default('any') }) }),
    z.object({ type: z.literal('ai_pattern'),payload: z.object({ pattern: z.enum(['FVG','OB','BOS','CHOCH','LIQ_SWEEP']) }) }),
  ]),
  triggerMode: z.enum(['once', 'every_time', 'once_per_bar']).default('once'),
  channels: z.array(ChannelSchema).min(1),
  webhookUrl: z.string().url().optional(),
  message: z.string().max(500).optional(),
  cooldownSeconds: z.number().int().min(0).default(60),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});
export type Alert = z.infer<typeof AlertSchema>;

export const AlertEventSchema = z.object({
  id: z.string().uuid(),
  alertId: z.string().uuid(),
  firedAt: z.string().datetime(),
  triggerValue: z.number().optional(),
  snapshot: z.record(z.unknown()).optional(),
});
export type AlertEvent = z.infer<typeof AlertEventSchema>;
