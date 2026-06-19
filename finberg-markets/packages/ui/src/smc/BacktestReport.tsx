// ============================================================================
// BacktestReport — renders a walk-forward backtest summary.
// ============================================================================

export interface BacktestSignatureBreakdown {
  count: number;
  winRate: number;
  avgR: number;
  expectancyR: number;
}

export interface BacktestReportData {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgR: number;
  expectancyR: number;
  profitFactor: number;
  maxDrawdownR: number;
  bySignature: Record<string, BacktestSignatureBreakdown>;
}

export function BacktestReport({ data }: { data: BacktestReportData }): JSX.Element {
  if (data.totalTrades === 0) {
    return <div className="text-text-subtle text-sm">No trades produced. Try a wider date range or different timeframe.</div>;
  }
  const pf = Number.isFinite(data.profitFactor) ? data.profitFactor.toFixed(2) : '∞';
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Trades" value={String(data.totalTrades)} />
        <Stat label="Win rate" value={`${(data.winRate * 100).toFixed(1)}%`} accent={data.winRate >= 0.5 ? 'good' : 'bad'} />
        <Stat label="Avg R" value={data.avgR.toFixed(2)} accent={data.avgR > 0 ? 'good' : 'bad'} />
        <Stat label="Expectancy R" value={data.expectancyR.toFixed(2)} accent={data.expectancyR > 0 ? 'good' : 'bad'} />
        <Stat label="Profit factor" value={pf} />
        <Stat label="Max DD (R)" value={data.maxDrawdownR.toFixed(2)} accent="bad" />
        <Stat label="Wins" value={String(data.wins)} accent="good" />
        <Stat label="Losses" value={String(data.losses)} accent="bad" />
      </div>

      <div>
        <h4 className="text-xs uppercase tracking-wider text-text-muted">Per setup signature</h4>
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="text-text-muted text-left">
              <th>Signature</th>
              <th className="text-right">Trades</th>
              <th className="text-right">Win %</th>
              <th className="text-right">Avg R</th>
              <th className="text-right">Exp R</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data.bySignature)
              .sort((a, b) => b[1].expectancyR - a[1].expectancyR)
              .map(([sig, b]) => (
                <tr key={sig} className="border-t border-bg-elevated">
                  <td className="py-1 font-mono">{sig}</td>
                  <td className="text-right py-1 font-mono">{b.count}</td>
                  <td className={`text-right py-1 font-mono ${b.winRate >= 0.5 ? 'text-accent' : 'text-danger'}`}>
                    {(b.winRate * 100).toFixed(1)}%
                  </td>
                  <td className="text-right py-1 font-mono">{b.avgR.toFixed(2)}</td>
                  <td className={`text-right py-1 font-mono ${b.expectancyR > 0 ? 'text-accent' : 'text-danger'}`}>
                    {b.expectancyR.toFixed(2)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'good' | 'bad' }): JSX.Element {
  const color = accent === 'good' ? 'text-accent' : accent === 'bad' ? 'text-danger' : 'text-text';
  return (
    <div className="rounded border border-bg-elevated bg-bg-subtle p-3">
      <div className="text-xs text-text-muted uppercase tracking-wider">{label}</div>
      <div className={`mt-1 text-xl font-semibold font-mono ${color}`}>{value}</div>
    </div>
  );
}
