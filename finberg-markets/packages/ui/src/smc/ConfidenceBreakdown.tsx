// ============================================================================
// ConfidenceBreakdown — transparent display of each component that feeds the
// scenario confidence score, so users (and our future selves) know why.
// ============================================================================

import type { ConfidenceBreakdown as Breakdown } from './types';

const LABELS: Record<keyof Breakdown, string> = {
  htfBiasStrength:    'HTF bias agreement',
  historicalAccuracy: 'Setup historical accuracy',
  sweepQuality:       'Liquidity sweep quality',
  confluenceCount:    'Confluence (FVG/OB/PD/session)',
  rrQuality:          'Risk / reward',
  volumeConfirmation: 'Volume confirmation',
};

const WEIGHTS: Record<keyof Breakdown, number> = {
  htfBiasStrength: 0.35,
  historicalAccuracy: 0.25,
  sweepQuality: 0.15,
  confluenceCount: 0.10,
  rrQuality: 0.10,
  volumeConfirmation: 0.05,
};

export function ConfidenceBreakdown({ breakdown }: { breakdown: Breakdown }): JSX.Element {
  const entries = (Object.entries(breakdown) as Array<[keyof Breakdown, number]>);
  return (
    <table className="w-full text-xs">
      <tbody>
        {entries.map(([key, value]) => (
          <tr key={key}>
            <td className="py-1 pr-2 text-text-muted">{LABELS[key]}</td>
            <td className="py-1 pr-2 text-right font-mono">{(value * 100).toFixed(0)}%</td>
            <td className="py-1 w-20">
              <div className="h-1.5 rounded bg-bg-elevated overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${value * 100}%` }} />
              </div>
            </td>
            <td className="py-1 pl-2 text-right text-text-subtle">×{WEIGHTS[key].toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
