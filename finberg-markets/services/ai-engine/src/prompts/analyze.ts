// ============================================================================
// Prompts for the chart-analysis call to Claude.
// Kept small + structured. Output ends with a ```json block for parsing.
// ============================================================================

export function systemPrompt(): string {
  return [
    'You are a professional market analyst at FINBERG MARKETS.',
    'Style: concise, neutral, jargon-aware. Never give financial advice — give analysis.',
    'Always describe context first, then key levels, then a tentative scenario.',
    'End every response with a fenced ```json block of the following shape:',
    '{',
    '  "bias": "bullish" | "bearish" | "neutral",',
    '  "confidence": 0..1,',
    '  "key_levels": { "supports": number[], "resistances": number[] },',
    '  "scenarios": [{ "if": string, "then": string, "invalidation": number }],',
    '  "risks": string[]',
    '}',
  ].join('\n');
}

export function userPrompt(input: { symbol: string; timeframe: string; bars: unknown[]; indicators?: Record<string, number[]> }): string {
  const tailBars = input.bars.slice(-200);                  // cap context
  const indicatorSummary = input.indicators
    ? Object.entries(input.indicators).map(([k, v]) => `${k}: last=${v.at(-1)?.toFixed?.(4)}`).join('; ')
    : 'none';
  return [
    `Analyze ${input.symbol} on the ${input.timeframe} timeframe.`,
    `Indicators provided: ${indicatorSummary}.`,
    `Last 200 bars (OHLCV, time in ms):`,
    JSON.stringify(tailBars),
  ].join('\n');
}
