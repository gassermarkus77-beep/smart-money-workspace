// ============================================================================
// Canvas2D renderer. WebGL2 sibling lives in renderer-webgl.ts (auto-selected
// by ChartEngine when visible bar count exceeds ~50k).
// ============================================================================

import type { Bar } from '@finberg/shared/market';
import type { ChartTheme } from './engine';

const AXIS_WIDTH = 64;          // right-side price axis
const AXIS_HEIGHT = 24;         // bottom time axis

export class Renderer {
  public readonly ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private theme: ChartTheme,
  ) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas2D unavailable');
    this.ctx = ctx;
  }

  resize(w: number, h: number, dpr: number): void {
    this.width = w;
    this.height = h;
    this.dpr = dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setTheme(t: ChartTheme): void { this.theme = t; }

  beginFrame(): void {
    this.ctx.fillStyle = this.theme.background;
    this.ctx.fillRect(0, 0, this.width / this.dpr, this.height / this.dpr);
  }

  clear(): void { this.beginFrame(); }

  // ----- Helpers -----------------------------------------------------------

  private get plotW(): number { return this.width / this.dpr - AXIS_WIDTH; }
  private get plotH(): number { return this.height / this.dpr - AXIS_HEIGHT; }

  /** Maps price → y pixel (top-down). */
  priceToY(price: number, min: number, max: number): number {
    return ((max - price) / (max - min)) * this.plotH;
  }

  /** Maps bar index in viewport → x pixel center. */
  barIndexToX(i: number, totalVisible: number): number {
    const slotW = this.plotW / totalVisible;
    return i * slotW + slotW / 2;
  }

  // ----- Drawing primitives ------------------------------------------------

  drawGrid(min: number, max: number): void {
    const { ctx, theme } = this;
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Horizontal price grid — 6 lines
    for (let i = 0; i <= 6; i++) {
      const y = (i / 6) * this.plotH;
      ctx.moveTo(0, y);
      ctx.lineTo(this.plotW, y);
    }
    // Vertical time grid — 8 lines
    for (let i = 0; i <= 8; i++) {
      const x = (i / 8) * this.plotW;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.plotH);
    }
    ctx.stroke();
  }

  drawCandles(bars: Bar[], min: number, max: number): void {
    const { ctx, theme } = this;
    const slotW = this.plotW / bars.length;
    const bodyW = Math.max(1, slotW * 0.7);

    for (let i = 0; i < bars.length; i++) {
      const b = bars[i]!;
      const x  = i * slotW + slotW / 2;
      const yO = this.priceToY(b.o, min, max);
      const yC = this.priceToY(b.c, min, max);
      const yH = this.priceToY(b.h, min, max);
      const yL = this.priceToY(b.l, min, max);
      const bull = b.c >= b.o;

      // wick
      ctx.strokeStyle = bull ? theme.bullWick : theme.bearWick;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yH);
      ctx.lineTo(x, yL);
      ctx.stroke();

      // body
      ctx.fillStyle = bull ? theme.bullCandle : theme.bearCandle;
      const top = Math.min(yO, yC);
      const h = Math.max(1, Math.abs(yC - yO));
      ctx.fillRect(x - bodyW / 2, top, bodyW, h);
    }
  }

  /** OHLC bars (classic American bars: open tick on left, close tick on right). */
  drawBars(bars: Bar[], min: number, max: number): void {
    const { ctx, theme } = this;
    const slotW = this.plotW / bars.length;
    const tickW = Math.max(2, slotW * 0.35);

    for (let i = 0; i < bars.length; i++) {
      const b = bars[i]!;
      const x  = i * slotW + slotW / 2;
      const yO = this.priceToY(b.o, min, max);
      const yC = this.priceToY(b.c, min, max);
      const yH = this.priceToY(b.h, min, max);
      const yL = this.priceToY(b.l, min, max);
      const bull = b.c >= b.o;

      ctx.strokeStyle = bull ? theme.bullCandle : theme.bearCandle;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, yH);   ctx.lineTo(x, yL);
      ctx.moveTo(x - tickW, yO); ctx.lineTo(x, yO);
      ctx.moveTo(x, yC); ctx.lineTo(x + tickW, yC);
      ctx.stroke();
    }
  }

  /** Line chart connecting close prices. */
  drawLineChart(bars: Bar[], min: number, max: number): void {
    const { ctx, theme } = this;
    const slotW = this.plotW / bars.length;
    ctx.strokeStyle = theme.bullCandle;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < bars.length; i++) {
      const x = i * slotW + slotW / 2;
      const y = this.priceToY(bars[i]!.c, min, max);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  /** Area chart: filled gradient below the close-price line. */
  drawAreaChart(bars: Bar[], min: number, max: number): void {
    const { ctx, theme } = this;
    const slotW = this.plotW / bars.length;

    const gradient = ctx.createLinearGradient(0, 0, 0, this.plotH);
    gradient.addColorStop(0, this.withAlpha(theme.bullCandle, 0.35));
    gradient.addColorStop(1, this.withAlpha(theme.bullCandle, 0));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, this.plotH);
    for (let i = 0; i < bars.length; i++) {
      const x = i * slotW + slotW / 2;
      const y = this.priceToY(bars[i]!.c, min, max);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.plotW, this.plotH);
    ctx.closePath();
    ctx.fill();

    // overlay stroke on top
    ctx.strokeStyle = theme.bullCandle;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < bars.length; i++) {
      const x = i * slotW + slotW / 2;
      const y = this.priceToY(bars[i]!.c, min, max);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  private withAlpha(hex: string, alpha: number): string {
    // Naive #rrggbb → rgba(r,g,b,alpha) — sufficient for theme colors here.
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    const n = parseInt(m[1]!, 16);
    return `rgba(${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff},${alpha})`;
  }

  drawAxes(bars: Bar[], min: number, max: number): void {
    const { ctx, theme } = this;
    ctx.fillStyle = theme.text;
    ctx.font = '11px ui-monospace,Menlo,monospace';

    // Right price axis
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 6; i++) {
      const price = max - ((max - min) * i) / 6;
      const y = (i / 6) * this.plotH;
      ctx.fillText(this.formatPrice(price), this.plotW + 6, y);
    }

    // Bottom time axis
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const step = Math.max(1, Math.floor(bars.length / 8));
    for (let i = 0; i < bars.length; i += step) {
      const b = bars[i]!;
      const x = this.barIndexToX(i, bars.length);
      ctx.fillText(this.formatTime(b.t), x, this.plotH + 4);
    }

    // Axis lines
    ctx.strokeStyle = theme.axisLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.plotW, 0);
    ctx.lineTo(this.plotW, this.plotH);
    ctx.moveTo(0, this.plotH);
    ctx.lineTo(this.plotW, this.plotH);
    ctx.stroke();
  }

  drawLine(points: Array<{ x: number; y: number }>, color: string, width = 1.5): void {
    if (points.length < 2) return;
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i]!.x, points[i]!.y);
    ctx.stroke();
  }

  private formatPrice(p: number): string {
    if (p >= 1000) return p.toFixed(2);
    if (p >= 1)    return p.toFixed(4);
    return p.toPrecision(5);
  }

  private formatTime(ms: number): string {
    const d = new Date(ms);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}
