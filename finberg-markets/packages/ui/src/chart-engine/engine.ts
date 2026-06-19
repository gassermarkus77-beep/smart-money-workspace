// ============================================================================
// FINBERG Chart Engine — core orchestrator
//
// Owns the canvas, viewport, scales, and the render loop. Independent of React
// so it can be embedded in any DOM context. Renderer auto-selects Canvas2D for
// up to ~50k visible bars; WebGL2 above that (see renderer.ts).
// ============================================================================

import type { Bar, Timeframe } from '@finberg/shared/market';
import { Renderer } from './renderer';
import { DataSource } from './datasource';
import { CrosshairController } from './crosshair';
import type { Series } from './series';

export interface ChartTheme {
  background: string;
  grid: string;
  text: string;
  axisLine: string;
  crosshair: string;
  bullCandle: string;
  bearCandle: string;
  bullWick: string;
  bearWick: string;
}

export const DARK_THEME: ChartTheme = {
  background: '#0b0f17',
  grid:       '#1a2332',
  text:       '#9aa4b2',
  axisLine:   '#2a3441',
  crosshair:  '#4c6079',
  bullCandle: '#26a69a',
  bearCandle: '#ef5350',
  bullWick:   '#26a69a',
  bearWick:   '#ef5350',
};

export interface ChartConfig {
  container: HTMLElement;
  symbol: string;
  timeframe: Timeframe;
  theme?: ChartTheme;
  showVolume?: boolean;
  initialBars?: Bar[];
}

export class ChartEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: Renderer;
  private readonly dataSource: DataSource;
  private readonly crosshair: CrosshairController;
  private readonly series: Series[] = [];
  private readonly theme: ChartTheme;

  /** Viewport: index of leftmost visible bar + visible bar count. */
  private viewStart = 0;
  private viewCount = 200;

  /** Pan/zoom interaction state. */
  private isDragging = false;
  private dragStartX = 0;
  private dragStartView = 0;

  private rafId: number | null = null;
  private needsDraw = true;

  constructor(private readonly config: ChartConfig) {
    this.theme = config.theme ?? DARK_THEME;

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'display:block;width:100%;height:100%;cursor:crosshair;';
    config.container.appendChild(this.canvas);

    this.renderer  = new Renderer(this.canvas, this.theme);
    this.dataSource = new DataSource(config.symbol, config.timeframe);
    this.crosshair  = new CrosshairController(this.canvas, this.theme);

    if (config.initialBars) this.dataSource.setBars(config.initialBars);

    this.bindEvents();
    this.handleResize();
    this.startLoop();
  }

  // ----- Public API --------------------------------------------------------

  setBars(bars: Bar[]): void {
    this.dataSource.setBars(bars);
    this.viewStart = Math.max(0, bars.length - this.viewCount);
    this.invalidate();
  }

  appendBar(bar: Bar): void {
    this.dataSource.appendBar(bar);
    this.invalidate();
  }

  addSeries(series: Series): void {
    this.series.push(series);
    this.invalidate();
  }

  setTheme(theme: ChartTheme): void {
    (this as { theme: ChartTheme }).theme = theme;
    this.renderer.setTheme(theme);
    this.crosshair.setTheme(theme);
    this.invalidate();
  }

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.canvas.remove();
  }

  // ----- Interactions ------------------------------------------------------

  private bindEvents(): void {
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('resize', this.handleResize);
  }

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const oldCount = this.viewCount;
    const newCount = Math.max(20, Math.min(5000, Math.round(oldCount * zoomFactor)));

    // Zoom around cursor x-position
    const rect = this.canvas.getBoundingClientRect();
    const cursorRatio = (e.clientX - rect.left) / rect.width;
    const cursorBar = this.viewStart + cursorRatio * oldCount;
    this.viewStart = Math.max(0, Math.round(cursorBar - cursorRatio * newCount));
    this.viewCount = newCount;
    this.invalidate();
  };

  private handlePointerDown = (e: PointerEvent): void => {
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartView = this.viewStart;
    this.canvas.style.cursor = 'grabbing';
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.isDragging) {
      const dx = e.clientX - this.dragStartX;
      const barsPerPx = this.viewCount / this.canvas.clientWidth;
      this.viewStart = Math.max(0, Math.round(this.dragStartView - dx * barsPerPx));
      this.invalidate();
    }
    const rect = this.canvas.getBoundingClientRect();
    this.crosshair.setPos(e.clientX - rect.left, e.clientY - rect.top);
    this.invalidate();
  };

  private handlePointerUp = (): void => {
    this.isDragging = false;
    this.canvas.style.cursor = 'crosshair';
  };

  private handleResize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const { clientWidth, clientHeight } = this.canvas;
    this.canvas.width  = Math.floor(clientWidth * dpr);
    this.canvas.height = Math.floor(clientHeight * dpr);
    this.renderer.resize(this.canvas.width, this.canvas.height, dpr);
    this.invalidate();
  };

  // ----- Render loop -------------------------------------------------------

  private invalidate(): void { this.needsDraw = true; }

  private startLoop(): void {
    const frame = (): void => {
      if (this.needsDraw) {
        this.draw();
        this.needsDraw = false;
      }
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  private draw(): void {
    const bars = this.dataSource.getBars();
    const visible = bars.slice(this.viewStart, this.viewStart + this.viewCount);
    if (visible.length === 0) {
      this.renderer.clear();
      return;
    }

    const { min, max } = this.priceRange(visible);
    this.renderer.beginFrame();
    this.renderer.drawGrid(min, max);
    this.renderer.drawCandles(visible, min, max);
    for (const s of this.series) s.draw(this.renderer, visible, min, max);
    this.renderer.drawAxes(visible, min, max);
    this.crosshair.draw(this.renderer.ctx);
  }

  private priceRange(bars: Bar[]): { min: number; max: number } {
    let min = Infinity, max = -Infinity;
    for (const b of bars) {
      if (b.l < min) min = b.l;
      if (b.h > max) max = b.h;
    }
    const pad = (max - min) * 0.05;
    return { min: min - pad, max: max + pad };
  }
}
