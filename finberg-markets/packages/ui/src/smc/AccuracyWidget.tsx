// ============================================================================
// AccuracyWidget — shows the historical accuracy (win rate, avg R) of similar
// setup signatures, fetched from the backtest accuracy rollup. Displayed next
// to the scenario confidence so users can sanity-check the AI claim.
// ============================================================================

export interface AccuracyRow {
  signature: string;
  windowDays: 30 | 90 | 365;
  sampleSize: number;
  winRate: number;       // 0..1
  avgR: number;
  expectancyR: number;
}

export interface AccuracyWidgetProps {
  rows: AccuracyRow[];
}

export function AccuracyWidget({ rows }: AccuracyWidgetProps): JSX.Element {
  if (rows.length === 0) {
    return (
      <div className="text-xs text-text-subtle">
        No historical data yet for this setup signature.
      </div>
    );
  }
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-text-muted">
          <th className="text-left py-1">Window</th>
          <th className="text-right py-1">N</th>
          <th className="text-right py-1">Win rate</th>
          <th className="text-right py-1">Avg R</th>
          <th className="text-right py-1">Exp R</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.windowDays} className="border-t border-bg-elevated">
            <td className="py-1">{r.windowDays}d</td>
            <td className="text-right py-1 font-mono">{r.sampleSize}</td>
            <td className={`text-right py-1 font-mono ${r.winRate >= 0.5 ? 'text-accent' : 'text-danger'}`}>
              {(r.winRate * 100).toFixed(1)}%
            </td>
            <td className="text-right py-1 font-mono">{r.avgR.toFixed(2)}</td>
            <td className={`text-right py-1 font-mono ${r.expectancyR > 0 ? 'text-accent' : 'text-danger'}`}>
              {r.expectancyR.toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
