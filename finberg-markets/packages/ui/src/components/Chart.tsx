// ============================================================================
// React adapter for ChartEngine.
// ============================================================================

import { useEffect, useRef } from 'react';
import type { Bar, Timeframe } from '@finberg/shared/market';
import { ChartEngine, DARK_THEME, type ChartTheme, type ChartType } from '../chart-engine/engine';

export interface ChartProps {
  symbol: string;
  timeframe: Timeframe;
  bars: Bar[];
  theme?: ChartTheme;
  chartType?: ChartType;
  className?: string;
}

export function Chart({
  symbol,
  timeframe,
  bars,
  theme = DARK_THEME,
  chartType = 'candles',
  className,
}: ChartProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ChartEngine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const engine = new ChartEngine({
      container: containerRef.current,
      symbol,
      timeframe,
      theme,
      initialBars: bars,
      chartType,
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  // Engine is recreated only when symbol or timeframe change; bars/type are pushed below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe]);

  useEffect(() => { engineRef.current?.setBars(bars); }, [bars]);
  useEffect(() => { engineRef.current?.setTheme(theme); }, [theme]);
  useEffect(() => { engineRef.current?.setChartType(chartType); }, [chartType]);

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }} />;
}
