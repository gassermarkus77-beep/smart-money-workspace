// ============================================================================
// Crosshair — pointer-tracking overlay; shared across linked panes.
// ============================================================================

import type { ChartTheme } from './engine';

export class CrosshairController {
  private x = -1;
  private y = -1;
  private active = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private theme: ChartTheme,
  ) {
    canvas.addEventListener('pointerleave', () => { this.active = false; });
    canvas.addEventListener('pointerenter', () => { this.active = true; });
  }

  setTheme(t: ChartTheme): void { this.theme = t; }

  setPos(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.active = true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active || this.x < 0) return;
    ctx.save();
    ctx.strokeStyle = this.theme.crosshair;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, 0);
    ctx.lineTo(this.x, this.canvas.clientHeight);
    ctx.moveTo(0, this.y);
    ctx.lineTo(this.canvas.clientWidth, this.y);
    ctx.stroke();
    ctx.restore();
  }
}
