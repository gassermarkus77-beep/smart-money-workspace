// ============================================================================
// ScenarioPanel — renders a generated scenario (bias, narrative, entry/SL/TPs,
// RR, confidence, risk warning). Designed to dock to the right of the chart.
// ============================================================================

import { useMemo } from 'react';
import type { Scenario } from './types.js';
import { ConfidenceBreakdown } from './ConfidenceBreakdown.js';

export interface ScenarioPanelProps {
  scenario: Scenario | null;
  loading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function ScenarioPanel({ scenario, loading, onRefresh, className }: ScenarioPanelProps): JSX.Element {
  if (loading) {
    return (
      <aside className={cn('w-[360px] border-l border-bg-elevated bg-bg-subtle p-4', className)}>
        <div className="animate-pulse text-text-muted text-sm">Analyzing market structure…</div>
      </aside>
    );
  }
  if (!scenario) {
    return (
      <aside className={cn('w-[360px] border-l border-bg-elevated bg-bg-subtle p-4', className)}>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">FINBERG SMC AI</h2>
        <p className="mt-3 text-sm text-text-subtle">
          No actionable scenario at this time. HTF bias is neutral or LTF lacks a qualifying trigger.
        </p>
        {onRefresh && (
          <button onClick={onRefresh} className="mt-4 text-xs text-accent hover:underline">Re-run analysis</button>
        )}
      </aside>
    );
  }

  const dirColor   = scenario.direction === 'long' ? 'text-accent'  : 'text-danger';
  const dirBgColor = scenario.direction === 'long' ? 'bg-accent/15' : 'bg-danger/15';
  const biasLabel  = `${scenario.htfBias.bias} (${Math.round(scenario.htfBias.strength * 100)}%)`;

  return (
    <aside className={cn('w-[380px] border-l border-bg-elevated bg-bg-subtle overflow-y-auto', className)}>
      <header className="p-4 border-b border-bg-elevated sticky top-0 bg-bg-subtle z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">FINBERG SMC AI</h2>
          <span className={cn('text-xs px-2 py-0.5 rounded font-mono', dirBgColor, dirColor)}>
            {scenario.direction.toUpperCase()}
          </span>
        </div>
        <h3 className="mt-2 text-base font-medium text-text leading-snug">{scenario.headline}</h3>
        <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
          <span>{scenario.symbol}</span>
          <span>•</span>
          <span>HTF: {biasLabel}</span>
          <span>•</span>
          <span>Entry: {scenario.entryTimeframe}</span>
        </div>
      </header>

      <section className="p-4 space-y-3 border-b border-bg-elevated">
        <Row label="Entry zone">
          {fmt(scenario.entryLow)} – {fmt(scenario.entryHigh)}
        </Row>
        <Row label="Stop loss">{fmt(scenario.stopPrice)}</Row>
        <Row label="Risk / Reward">
          <span className={scenario.riskReward >= 3 ? 'text-accent' : 'text-text'}>
            {scenario.riskReward.toFixed(2)}R
          </span>
        </Row>
      </section>

      <section className="p-4 border-b border-bg-elevated">
        <h4 className="text-xs uppercase tracking-wider text-text-muted">Targets</h4>
        <ul className="mt-2 space-y-1 text-sm">
          {scenario.targets.map(t => (
            <li key={t.rank} className="flex justify-between font-mono">
              <span className="text-text-muted">TP{t.rank}</span>
              <span>{fmt(t.price)}</span>
              <span className="text-text-subtle">{t.label}</span>
              <span className="text-accent">{t.rMultiple}R</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="p-4 border-b border-bg-elevated">
        <h4 className="text-xs uppercase tracking-wider text-text-muted">Confidence</h4>
        <div className="mt-2 flex items-center gap-3">
          <ConfidenceMeter value={scenario.confidence} />
          <span className="text-xl font-semibold">{Math.round(scenario.confidence * 100)}%</span>
        </div>
        <details className="mt-3 text-xs text-text-muted">
          <summary className="cursor-pointer hover:text-text">Show breakdown</summary>
          <div className="mt-2"><ConfidenceBreakdown breakdown={scenario.confidenceBreakdown} /></div>
        </details>
      </section>

      <section className="p-4 border-b border-bg-elevated">
        <h4 className="text-xs uppercase tracking-wider text-text-muted">Analysis</h4>
        <div className="mt-2 text-sm leading-relaxed whitespace-pre-line">{scenario.narrativeMarkdown}</div>
      </section>

      <section className="p-4 border-b border-bg-elevated">
        <h4 className="text-xs uppercase tracking-wider text-danger">Risk Warning</h4>
        <div className="mt-2 text-sm leading-relaxed whitespace-pre-line text-text-muted">
          {scenario.riskWarningMarkdown}
        </div>
      </section>

      {onRefresh && (
        <div className="p-4">
          <button onClick={onRefresh} className="w-full py-2 rounded bg-accent text-white hover:bg-accent-hover text-sm font-medium">
            Re-run analysis
          </button>
        </div>
      )}
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="font-mono">{children}</span>
    </div>
  );
}

function ConfidenceMeter({ value }: { value: number }): JSX.Element {
  const segments = useMemo(() => Array.from({ length: 10 }, (_, i) => (i / 10) < value), [value]);
  return (
    <div className="flex gap-0.5 flex-1">
      {segments.map((on, i) => (
        <div
          key={i}
          className={cn('h-2 flex-1 rounded-sm', on ? (value >= 0.7 ? 'bg-accent' : value >= 0.4 ? 'bg-yellow-500' : 'bg-danger') : 'bg-bg-elevated')}
        />
      ))}
    </div>
  );
}

function cn(...c: Array<string | undefined | false | null>): string { return c.filter(Boolean).join(' '); }
function fmt(x: number): string {
  if (x >= 1000) return x.toFixed(2);
  if (x >= 1)    return x.toFixed(4);
  return x.toPrecision(5);
}
