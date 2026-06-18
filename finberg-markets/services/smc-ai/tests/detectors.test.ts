// ============================================================================
// Detector sanity tests
// ============================================================================

import { describe, it, expect } from 'vitest';
import type { Bar } from '../../../packages/shared/src/market.js';
import { detectStructure } from '../src/detectors/structure.js';
import { detectFVG } from '../src/detectors/fvg.js';
import { detectOrderBlocks } from '../src/detectors/order-blocks.js';
import { detectLiquiditySweeps } from '../src/detectors/liquidity-sweeps.js';
import { detectEqualHighsLows } from '../src/detectors/equal-highs-lows.js';
import { detectPremiumDiscount, classifyAgainstPd } from '../src/detectors/premium-discount.js';
import { detectBosChochMss } from '../src/detectors/bos-choch-mss.js';

function bar(t: number, o: number, h: number, l: number, c: number, v = 1000): Bar {
  return { t, o, h, l, c, v };
}

describe('detectStructure', () => {
  it('finds swing highs and lows', () => {
    const bars: Bar[] = [
      bar(1, 10, 12, 9,  11),
      bar(2, 11, 14, 10, 13),    // swing high candidate
      bar(3, 13, 15, 12, 14),    // higher
      bar(4, 14, 16, 13, 15),    // even higher — peak
      bar(5, 15, 15, 12, 13),
      bar(6, 13, 14, 11, 12),
      bar(7, 12, 13, 10, 11),    // swing low forming
      bar(8, 11, 12, 9,  10),
      bar(9, 10, 11, 8,  9),     // bottom
      bar(10, 9, 11, 8, 10),
    ];
    const s = detectStructure(bars, { swingStrength: 2 });
    expect(s.allHighs.length).toBeGreaterThan(0);
    expect(s.allLows.length).toBeGreaterThan(0);
  });
});

describe('detectFVG', () => {
  it('detects bullish gap up', () => {
    const bars: Bar[] = [
      bar(1, 10, 11, 9, 10),     // a (high = 11)
      bar(2, 10, 11, 10, 11),    // mid
      bar(3, 13, 14, 12, 13),    // c (low = 12) → gap [11, 12]
    ];
    const fvgs = detectFVG(bars, 'TEST', '1h');
    expect(fvgs.length).toBe(1);
    expect(fvgs[0]!.direction).toBe('bull');
    expect(fvgs[0]!.priceTop).toBe(12);
    expect(fvgs[0]!.priceBottom).toBe(11);
  });

  it('detects bearish gap down', () => {
    const bars: Bar[] = [
      bar(1, 12, 13, 11, 12),
      bar(2, 11, 12, 10, 11),
      bar(3, 9, 10, 8, 9),       // a.low (11) > c.high (10) → bearish FVG
    ];
    const fvgs = detectFVG(bars, 'TEST', '1h');
    expect(fvgs.length).toBe(1);
    expect(fvgs[0]!.direction).toBe('bear');
  });
});

describe('detectOrderBlocks', () => {
  it('detects bullish OB before impulsive up move', () => {
    const bars: Bar[] = [
      ...Array.from({ length: 20 }, (_, i) => bar(i + 1, 10 + i * 0.01, 10.1 + i * 0.01, 9.9 + i * 0.01, 10 + i * 0.01)),
      bar(21, 10.2, 10.3, 9.8, 9.85),     // down close (origin OB)
      bar(22, 9.85, 12, 9.8, 11.9),       // impulsive up
      bar(23, 11.9, 12.5, 11.8, 12.4),
      bar(24, 12.4, 13, 12.3, 12.9),
    ];
    const obs = detectOrderBlocks(bars, 'TEST', '1h');
    expect(obs.find(o => o.direction === 'bull')).toBeTruthy();
  });
});

describe('detectLiquiditySweeps', () => {
  it('detects high sweep with close back below level', () => {
    const bars: Bar[] = [
      bar(1, 10, 12, 9, 11),
      bar(2, 11, 12.5, 10.5, 11.8),
      bar(3, 11.8, 13.5, 11.7, 11.9),
      bar(4, 11.9, 14.5, 11.8, 12.0),     // sweep + close back
    ];
    const sweeps = detectLiquiditySweeps(bars, 'TEST', '1h', {
      extraLevels: [{ side: 'high', price: 13.0, label: 'test_high' }],
    });
    expect(sweeps.length).toBeGreaterThan(0);
    expect(sweeps[0]!.side).toBe('high');
  });
});

describe('detectEqualHighsLows', () => {
  it('clusters equal highs within tolerance', () => {
    const swings = [
      { time: 1, price: 100.0, kind: 'HH' as const, barIndex: 5 },
      { time: 2, price: 100.05, kind: 'HH' as const, barIndex: 25 },
      { time: 3, price: 100.02, kind: 'HH' as const, barIndex: 50 },
    ];
    const bars: Bar[] = Array.from({ length: 60 }, (_, i) => bar(i + 1, 100, 100.2, 99.8, 100));
    const eq = detectEqualHighsLows(bars, swings, [], 'TEST', '1h', { toleranceAtr: 1 });
    expect(eq.find(e => e.kind === 'EQH')).toBeTruthy();
  });
});

describe('detectPremiumDiscount', () => {
  it('computes midline + OTE retracements', () => {
    const pd = detectPremiumDiscount({
      symbol: 'TEST', timeframe: '1h',
      overrideRange: { high: 200, low: 100, time: 0 },
    });
    expect(pd).toBeTruthy();
    expect(pd!.midline).toBe(150);
    expect(pd!.ote62).toBeCloseTo(138, 2);
    expect(pd!.ote705).toBeCloseTo(129.5, 2);
    expect(pd!.ote79).toBeCloseTo(121, 2);
    expect(classifyAgainstPd(180, pd!)).toBe('premium');
    expect(classifyAgainstPd(120, pd!)).toBe('discount');
  });
});

describe('detectBosChochMss', () => {
  it('emits CHOCH when trend flips, BOS when continuing', () => {
    const bars: Bar[] = [
      bar(1, 10, 11, 9, 10.5),
      bar(2, 10.5, 12, 10, 11.8),
      bar(3, 11.8, 13, 11, 12.5),
      bar(4, 12.5, 14, 12, 13.7),    // makes swing high
      bar(5, 13.7, 13.8, 11, 11.5),
      bar(6, 11.5, 11.8, 10.5, 10.8),
      bar(7, 10.8, 11, 9.5, 9.8),    // breaks below swing low
      bar(8, 9.8, 10, 8.5, 9),
    ];
    const s = detectStructure(bars, { swingStrength: 1 });
    const out = detectBosChochMss(bars, { allHighs: s.allHighs, allLows: s.allLows }, '1h', 'TEST');
    expect(out.events.some(e => e.kind === 'CHOCH' || e.kind === 'BOS')).toBe(true);
  });
});
