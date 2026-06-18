// ============================================================================
// SmcOverlay — renders SMC detections on top of a ChartEngine canvas.
//
// Currently this is a SVG overlay positioned absolutely over the chart. A
// production v2 should be integrated as a native ChartEngine Series so it
// participates in the WebGL render loop. SVG is fine for visual fidelity at
// MVP; it just costs a few ms when there are >200 active events.
// ============================================================================

import { useMemo } from 'react';
import type { Bar } from '@finberg/shared/market';
import type { SmcEvent } from './types.js';

export interface SmcOverlayProps {
  events: SmcEvent[];
  bars: Bar[];
  viewStartTime: number;
  viewEndTime: number;
  priceMin: number;
  priceMax: number;
  width: number;
  height: number;
  /** Only events of these kinds are drawn. Default: everything. */
  show?: SmcEvent['kind'][];
}

const COLORS = {
  fvgBull: 'rgba(38,166,154,0.18)',
  fvgBear: 'rgba(239,83,80,0.18)',
  obBull:  'rgba(38,166,154,0.32)',
  obBear:  'rgba(239,83,80,0.32)',
  bbBull:  'rgba(91,155,213,0.32)',
  bbBear:  'rgba(255,152,0,0.32)',
  pd:      'rgba(154,164,178,0.10)',
  level:   '#ffffff',
  sweep:   '#ffeb3b',
  bos:     '#26a69a',
  choch:   '#ff9800',
  mss:     '#ef5350',
};

export function SmcOverlay(props: SmcOverlayProps): JSX.Element {
  const xOf = useMemo(() => buildXScale(props.bars, props.viewStartTime, props.viewEndTime, props.width), [props.bars, props.viewStartTime, props.viewEndTime, props.width]);
  const yOf = (price: number): number =>
    ((props.priceMax - price) / (props.priceMax - props.priceMin)) * props.height;

  const allowed = props.show ? new Set(props.show) : null;
  const events = allowed ? props.events.filter(e => allowed.has(e.kind)) : props.events;

  return (
    <svg
      width={props.width}
      height={props.height}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {events.map(e => renderEvent(e, xOf, yOf, props.width))}
    </svg>
  );
}

function buildXScale(bars: Bar[], viewStart: number, viewEnd: number, width: number) {
  return (t: number): number => {
    if (viewEnd === viewStart) return 0;
    const ratio = (t - viewStart) / (viewEnd - viewStart);
    return Math.max(0, Math.min(1, ratio)) * width;
  };
}

function renderEvent(
  e: SmcEvent,
  xOf: (t: number) => number,
  yOf: (price: number) => number,
  width: number,
): JSX.Element | null {
  const key = e.id;

  switch (e.kind) {
    case 'FVG': {
      const x = xOf(e.startedAt);
      const fill = e.direction === 'bull' ? COLORS.fvgBull : COLORS.fvgBear;
      const yTop = yOf(e.priceTop!);
      const yBot = yOf(e.priceBottom!);
      return <rect key={key} x={x} y={yTop} width={width - x} height={Math.max(1, yBot - yTop)} fill={fill} />;
    }
    case 'OB':
    case 'BB': {
      const x = xOf(e.startedAt);
      const yTop = yOf(e.priceTop!);
      const yBot = yOf(e.priceBottom!);
      const fill = e.kind === 'OB'
        ? (e.direction === 'bull' ? COLORS.obBull : COLORS.obBear)
        : (e.direction === 'bull' ? COLORS.bbBull : COLORS.bbBear);
      return (
        <g key={key}>
          <rect x={x} y={yTop} width={width - x} height={Math.max(1, yBot - yTop)} fill={fill} />
          <text x={x + 4} y={yTop + 12} fontSize={10} fill="#e6ebf2" fontFamily="ui-monospace">{e.kind}</text>
        </g>
      );
    }
    case 'PD_ZONE': {
      const yTop = yOf(e.priceTop!);
      const yBot = yOf(e.priceBottom!);
      const yMid = yOf(e.midline!);
      const yOte62 = yOf(e.ote62!);
      const yOte79 = yOf(e.ote79!);
      return (
        <g key={key}>
          <rect x={0} y={Math.min(yTop, yMid)} width={width} height={Math.abs(yMid - yTop)} fill={COLORS.pd} />
          <line x1={0} x2={width} y1={yMid} y2={yMid} stroke="#9aa4b2" strokeDasharray="2 3" />
          <line x1={0} x2={width} y1={yOte62} y2={yOte62} stroke="#26a69a" strokeDasharray="2 3" />
          <line x1={0} x2={width} y1={yOte79} y2={yOte79} stroke="#26a69a" strokeDasharray="2 3" />
        </g>
      );
    }
    case 'PDH': case 'PDL': case 'PWH': case 'PWL': case 'ASIA_H': case 'ASIA_L':
    case 'EQH': case 'EQL':
    case 'LIQ_INT': case 'LIQ_EXT': {
      const y = yOf(e.price!);
      return (
        <g key={key}>
          <line x1={0} x2={width} y1={y} y2={y} stroke={COLORS.level} strokeWidth={1} strokeDasharray="3 4" opacity={0.5} />
          <text x={4} y={y - 3} fontSize={9} fill="#9aa4b2" fontFamily="ui-monospace">{e.kind}</text>
        </g>
      );
    }
    case 'LIQ_SWEEP':
    case 'LDN_SWEEP':
    case 'NY_MANIP': {
      const x = xOf(e.startedAt);
      const y = yOf(e.price!);
      return (
        <g key={key}>
          <circle cx={x} cy={y} r={5} fill={COLORS.sweep} />
          <text x={x + 7} y={y + 4} fontSize={10} fill={COLORS.sweep} fontFamily="ui-monospace">SW</text>
        </g>
      );
    }
    case 'BOS': case 'CHOCH': case 'MSS': {
      const x = xOf(e.startedAt);
      const y = yOf(e.price!);
      const color = e.kind === 'BOS' ? COLORS.bos : e.kind === 'CHOCH' ? COLORS.choch : COLORS.mss;
      return (
        <g key={key}>
          <line x1={x - 20} x2={x + 20} y1={y} y2={y} stroke={color} strokeWidth={1.5} />
          <text x={x + 22} y={y + 4} fontSize={10} fill={color} fontFamily="ui-monospace">{e.kind}</text>
        </g>
      );
    }
    default:
      return null;
  }
}
