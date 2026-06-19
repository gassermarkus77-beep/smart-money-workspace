// ============================================================================
// FinScript runtime — provided to compiled scripts in the Web Worker.
// Implements ta.*, math.*, plot, input, alert. Sandboxed: no DOM/network.
// ============================================================================

import type { Bar } from '@finberg/shared/market';

export interface ExecContext {
  bar: Bar & { bar_index: number };
  bars: ReadonlyArray<Bar>;
  state: Map<string, unknown>;
  inputs: Map<string, unknown>;
  outputs: { plots: PlotOutput[]; alerts: AlertOutput[] };
}

export interface PlotOutput { title: string; series: number[]; color?: string; width?: number; style?: string }
export interface AlertOutput { title: string; message: string; conditions: boolean[] }

// ----- TA library ---------------------------------------------------------
function tafns(ctx: ExecContext) {
  return {
    sma(source: number, length: number): number {
      const key = `sma:${length}`;
      const buf = (ctx.state.get(key) as number[]) ?? (ctx.state.set(key, []), ctx.state.get(key) as number[]);
      buf.push(source);
      if (buf.length > length) buf.shift();
      if (buf.length < length) return NaN;
      let s = 0;
      for (const v of buf) s += v;
      return s / length;
    },
    ema(source: number, length: number): number {
      const key = `ema:${length}`;
      const prev = ctx.state.get(key) as number | undefined;
      const k = 2 / (length + 1);
      const val = prev === undefined || Number.isNaN(prev) ? source : source * k + prev * (1 - k);
      ctx.state.set(key, val);
      return val;
    },
    rsi(source: number, length: number): number {
      const key = `rsi:${length}`;
      const s = (ctx.state.get(key) as { prev?: number; gainAvg: number; lossAvg: number; n: number }) ??
                { gainAvg: 0, lossAvg: 0, n: 0 };
      if (s.prev !== undefined) {
        const ch = source - s.prev;
        const gain = Math.max(0, ch), loss = Math.max(0, -ch);
        if (s.n < length) {
          s.gainAvg += gain; s.lossAvg += loss;
          if (++s.n === length) { s.gainAvg /= length; s.lossAvg /= length; }
        } else {
          s.gainAvg = (s.gainAvg * (length - 1) + gain) / length;
          s.lossAvg = (s.lossAvg * (length - 1) + loss) / length;
        }
      }
      s.prev = source;
      ctx.state.set(key, s);
      if (s.lossAvg === 0) return 100;
      const rs = s.gainAvg / s.lossAvg;
      return 100 - 100 / (1 + rs);
    },
    atr(length: number): number {
      const key = `atr:${length}`;
      const s = (ctx.state.get(key) as { tr: number[]; atr?: number }) ?? { tr: [] };
      const i = ctx.bar.bar_index;
      const prev = i > 0 ? ctx.bars[i - 1] : undefined;
      const tr = prev
        ? Math.max(ctx.bar.h - ctx.bar.l, Math.abs(ctx.bar.h - prev.c), Math.abs(ctx.bar.l - prev.c))
        : ctx.bar.h - ctx.bar.l;
      if (s.atr === undefined) {
        s.tr.push(tr);
        if (s.tr.length === length) {
          s.atr = s.tr.reduce((a, b) => a + b, 0) / length;
        }
      } else {
        s.atr = (s.atr * (length - 1) + tr) / length;
      }
      ctx.state.set(key, s);
      return s.atr ?? NaN;
    },
    crossover(a: number, b: number): boolean {
      const key = `xo:${a.toFixed(8)}|${b.toFixed(8)}`;
      const prev = ctx.state.get(key) as { a: number; b: number } | undefined;
      ctx.state.set(key, { a, b });
      if (!prev) return false;
      return prev.a <= prev.b && a > b;
    },
    crossunder(a: number, b: number): boolean {
      const key = `xu:${a.toFixed(8)}|${b.toFixed(8)}`;
      const prev = ctx.state.get(key) as { a: number; b: number } | undefined;
      ctx.state.set(key, { a, b });
      if (!prev) return false;
      return prev.a >= prev.b && a < b;
    },
    highest(source: number, length: number): number {
      const key = `hh:${length}`;
      const buf = (ctx.state.get(key) as number[]) ?? (ctx.state.set(key, []), ctx.state.get(key) as number[]);
      buf.push(source);
      if (buf.length > length) buf.shift();
      return Math.max(...buf);
    },
    lowest(source: number, length: number): number {
      const key = `ll:${length}`;
      const buf = (ctx.state.get(key) as number[]) ?? (ctx.state.set(key, []), ctx.state.get(key) as number[]);
      buf.push(source);
      if (buf.length > length) buf.shift();
      return Math.min(...buf);
    },
  };
}

const mathLib = {
  abs: Math.abs, max: Math.max, min: Math.min,
  round: Math.round, floor: Math.floor, ceil: Math.ceil,
  log: Math.log, exp: Math.exp, pow: Math.pow, sqrt: Math.sqrt,
  sign: Math.sign,
};

const colorLib = {
  new: (r: number, g: number, b: number, a = 255) => `rgba(${r},${g},${b},${a / 255})`,
  blue: '#5b9bd5', red: '#ef5350', green: '#26a69a', orange: '#ff9800',
  gray: '#9aa4b2', white: '#ffffff', black: '#000000', yellow: '#ffeb3b',
};

function inputLib(ctx: ExecContext) {
  let idx = 0;
  const next = (def: unknown): unknown => {
    const key = `__in_${idx++}`;
    if (ctx.inputs.has(key)) return ctx.inputs.get(key);
    ctx.inputs.set(key, def);
    return def;
  };
  return {
    int:    (def: number, _title?: string) => next(def) as number,
    float:  (def: number, _title?: string) => next(def) as number,
    bool:   (def: boolean, _title?: string) => next(def) as boolean,
    string: (def: string, _title?: string) => next(def) as string,
    color:  (def: string, _title?: string) => next(def) as string,
    source: (def: number, _title?: string) => next(def) as number,
  };
}

function plotLib(ctx: ExecContext) {
  return (value: number, title = '', opts: { color?: string; width?: number; style?: string } = {}) => {
    let p = ctx.outputs.plots.find(x => x.title === title);
    if (!p) { p = { title, series: [], color: opts.color, width: opts.width, style: opts.style }; ctx.outputs.plots.push(p); }
    p.series.push(value);
  };
}

function plotshapeLib(ctx: ExecContext) {
  return (_cond: boolean, _opts: Record<string, unknown> = {}) => { /* TODO */ void ctx; };
}

function hlineLib(_ctx: ExecContext) {
  return (_price: number, _opts: Record<string, unknown> = {}) => { /* TODO */ };
}

function fillLib(_ctx: ExecContext) {
  return (_a: number, _b: number, _opts: Record<string, unknown> = {}) => { /* TODO */ };
}

function alertLib(_ctx: ExecContext) {
  return (_message: string) => { /* TODO */ };
}

function alertconditionLib(ctx: ExecContext) {
  return (condition: boolean, title = '', message = '') => {
    let a = ctx.outputs.alerts.find(x => x.title === title);
    if (!a) { a = { title, message, conditions: [] }; ctx.outputs.alerts.push(a); }
    a.conditions.push(condition);
  };
}

export const Runtime = {
  ta: tafns,
  math: mathLib,
  color: colorLib,
  input: inputLib,
  plot: plotLib,
  plotshape: plotshapeLib,
  hline: hlineLib,
  fill: fillLib,
  alert: alertLib,
  alertcondition: alertconditionLib,
};
