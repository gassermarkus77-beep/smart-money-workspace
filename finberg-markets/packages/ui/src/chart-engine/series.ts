// ============================================================================
// Series — anything drawn on top of price (indicators, overlays).
// ============================================================================

import type { Bar } from '@finberg/shared/market';
import type { Renderer } from './renderer';

export interface Series {
  draw(renderer: Renderer, visibleBars: Bar[], min: number, max: number): void;
}

// ----- Built-in: simple moving average ------------------------------------
export class LineSeries implements Series {
  constructor(
    private readonly values: ReadonlyArray<number | null>,
    private readonly color: string = '#5b9bd5',
    private readonly width: number = 1.5,
    /** Index offset between the values array and the source bars. */
    private readonly offset: number = 0,
  ) {}

  draw(renderer: Renderer, visibleBars: Bar[], min: number, max: number): void {
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < visibleBars.length; i++) {
      const v = this.values[i + this.offset];
      if (v == null) continue;
      points.push({
        x: renderer.barIndexToX(i, visibleBars.length),
        y: renderer.priceToY(v, min, max),
      });
    }
    renderer.drawLine(points, this.color, this.width);
  }
}

// ----- Built-in: candle series is drawn by the engine directly -----------
// Kept here as a type marker for plugin compatibility.
export interface CandleSeries extends Series {
  readonly kind: 'candle';
}
