'use client';

// ============================================================================
// Top toolbar — symbol, chart-type, timeframe selector, indicators, layouts.
// Functional bits: chart type + timeframe + symbol. The rest (indicators,
// alerts, replay) are visible but inert placeholders pending Phase-2 work.
// ============================================================================

import {
  Plus, BarChart3, CandlestickChart, LineChart, AreaChart, Activity,
  TrendingUp, LayoutGrid, Bell, Rewind, Undo2, Redo2,
  Settings, Maximize2, Camera, ChevronDown,
} from 'lucide-react';
import type { Timeframe } from '@finberg/shared/market';
import type { ChartType } from '@finberg/ui';
import { POPULAR_SYMBOLS } from '../lib/binance';

const TIMEFRAMES: Array<{ key: Timeframe; label: string }> = [
  { key: '1m',  label: '1m' },
  { key: '5m',  label: '5m' },
  { key: '15m', label: '15m' },
  { key: '1h',  label: '1h' },
  { key: '4h',  label: '4h' },
  { key: '1d',  label: 'D' },
  { key: '1w',  label: 'W' },
];

const CHART_TYPES: Array<{ key: ChartType; label: string; icon: React.ReactNode }> = [
  { key: 'candles',     label: 'Candles',     icon: <CandlestickChart size={14} /> },
  { key: 'heikin-ashi', label: 'Heikin Ashi', icon: <Activity        size={14} /> },
  { key: 'bars',        label: 'OHLC bars',   icon: <BarChart3       size={14} /> },
  { key: 'line',        label: 'Line',        icon: <LineChart       size={14} /> },
  { key: 'area',        label: 'Area',        icon: <AreaChart       size={14} /> },
];

export interface ChartToolbarProps {
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  onSymbol: (s: string) => void;
  onTimeframe: (tf: Timeframe) => void;
  onChartType: (t: ChartType) => void;
  connected: boolean;
}

export function ChartToolbar(props: ChartToolbarProps): JSX.Element {
  return (
    <header className="h-12 px-2 border-b border-bg-elevated bg-bg flex items-center gap-1.5 text-text-muted">
      {/* Symbol */}
      <div className="flex items-center gap-1.5 px-2">
        <span className="w-5 h-5 rounded-full bg-orange-500 text-[10px] text-white flex items-center justify-center font-bold">
          {props.symbol[0] ?? '?'}
        </span>
        <input
          value={props.symbol}
          onChange={(e) => props.onSymbol(e.target.value.toUpperCase())}
          list="finberg-tb-symbols"
          spellCheck={false}
          className="bg-transparent text-text font-semibold text-sm w-24 focus:outline-none"
        />
        <datalist id="finberg-tb-symbols">
          {POPULAR_SYMBOLS.map(s => <option key={s} value={s} />)}
        </datalist>
        <IconBtn title="Add symbol"><Plus size={14} /></IconBtn>
      </div>

      <Divider />

      {/* Timeframes */}
      <div className="flex items-center gap-0.5">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf.key}
            onClick={() => props.onTimeframe(tf.key)}
            className={`min-w-[28px] h-7 px-2 text-xs font-semibold rounded transition-colors ${
              props.timeframe === tf.key
                ? 'bg-accent/15 text-accent'
                : 'text-text-muted hover:bg-bg-elevated hover:text-text'
            }`}
          >
            {tf.label}
          </button>
        ))}
        <button className="ml-0.5 h-7 px-1.5 text-xs flex items-center gap-0.5 rounded hover:bg-bg-elevated hover:text-text">
          <ChevronDown size={12} />
        </button>
      </div>

      <Divider />

      {/* Chart type */}
      <Dropdown
        title="Chart type"
        current={CHART_TYPES.find(c => c.key === props.chartType)?.icon ?? <CandlestickChart size={14} />}
        items={CHART_TYPES.map(c => ({
          key: c.key,
          label: c.label,
          icon: c.icon,
          active: c.key === props.chartType,
          onClick: () => props.onChartType(c.key),
        }))}
      />

      {/* Compare / multiple sym */}
      <IconBtn title="Compare or add another instrument"><TrendingUp size={14} /></IconBtn>

      <Divider />

      {/* Indicators */}
      <button className="h-7 px-2.5 text-xs font-medium rounded hover:bg-bg-elevated hover:text-text flex items-center gap-1.5">
        <Activity size={14} />
        Indicators
        <ChevronDown size={12} />
      </button>

      {/* Layouts */}
      <IconBtn title="Select layout"><LayoutGrid size={14} /></IconBtn>

      <Divider />

      {/* Alert */}
      <button className="h-7 px-2 text-xs font-medium rounded hover:bg-bg-elevated hover:text-text flex items-center gap-1.5">
        <Bell size={14} />
        Alert
      </button>

      {/* Replay */}
      <button className="h-7 px-2 text-xs font-medium rounded hover:bg-bg-elevated hover:text-text flex items-center gap-1.5">
        <Rewind size={14} />
        Replay
      </button>

      <Divider />

      {/* Undo / Redo */}
      <IconBtn title="Undo"><Undo2 size={14} /></IconBtn>
      <IconBtn title="Redo"><Redo2 size={14} /></IconBtn>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-1">
        <ConnectionDot connected={props.connected} />
        <IconBtn title="Settings"><Settings size={14} /></IconBtn>
        <IconBtn title="Fullscreen"><Maximize2 size={14} /></IconBtn>
        <IconBtn title="Screenshot"><Camera size={14} /></IconBtn>
        <button className="h-7 px-3 text-xs font-semibold rounded bg-accent text-white hover:bg-accent-hover">
          Publish
        </button>
      </div>
    </header>
  );
}

function IconBtn({ children, title }: { children: React.ReactNode; title: string }): JSX.Element {
  return (
    <button
      title={title}
      className="w-7 h-7 inline-flex items-center justify-center rounded text-text-muted hover:bg-bg-elevated hover:text-text"
    >
      {children}
    </button>
  );
}

function Divider(): JSX.Element { return <span className="w-px h-5 bg-bg-elevated mx-1" />; }

function Dropdown(props: {
  title: string;
  current: React.ReactNode;
  items: Array<{ key: string; label: string; icon: React.ReactNode; active?: boolean; onClick: () => void }>;
}): JSX.Element {
  return (
    <div className="relative group">
      <button
        title={props.title}
        className="h-7 px-1.5 text-xs flex items-center gap-1 rounded text-text-muted hover:bg-bg-elevated hover:text-text"
      >
        {props.current}
        <ChevronDown size={12} />
      </button>
      <div className="hidden group-hover:block absolute top-full left-0 z-50 mt-0.5 w-44 bg-bg-elevated border border-bg-subtle rounded-md shadow-xl py-1">
        {props.items.map(it => (
          <button
            key={it.key}
            onClick={it.onClick}
            className={`w-full px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-bg-subtle ${
              it.active ? 'text-accent' : 'text-text'
            }`}
          >
            {it.icon}
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConnectionDot({ connected }: { connected: boolean }): JSX.Element {
  return (
    <span className="flex items-center gap-1.5 mr-2 text-[11px] font-mono">
      <span className={`relative inline-flex w-2 h-2 rounded-full ${connected ? 'bg-accent' : 'bg-yellow-500'}`}>
        {connected && (
          <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-60" />
        )}
      </span>
      <span className={connected ? 'text-accent' : 'text-yellow-500'}>{connected ? 'LIVE' : '...'}</span>
    </span>
  );
}
