// ============================================================================
// Claude-powered chart commentary (streamed).
// Default model: claude-opus-4-8 (analysis). Override with ANTHROPIC_MODEL_ANALYSIS.
// Output is incremental text plus a final structured JSON block.
// ============================================================================

import Anthropic from '@anthropic-ai/sdk';
import { systemPrompt, userPrompt } from './prompts/analyze.js';

const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });
const MODEL = process.env['ANTHROPIC_MODEL_ANALYSIS'] ?? 'claude-opus-4-8';

export interface AnalyzeInput {
  symbol: string;
  timeframe: string;
  bars: unknown[];
  indicators?: Record<string, number[]>;
}

export interface AnalyzeChunk {
  delta?: string;
  done?: boolean;
  finalJson?: unknown;
}

export async function* analyzeChart(input: AnalyzeInput): AsyncGenerator<AnalyzeChunk> {
  if (!process.env['ANTHROPIC_API_KEY']) {
    yield {
      delta: 'AI analysis unavailable: ANTHROPIC_API_KEY not configured.\n',
      done: true,
    };
    return;
  }

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 1500,
    system: systemPrompt(),
    messages: [{ role: 'user', content: userPrompt(input) }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield { delta: event.delta.text };
    }
  }

  const final = await stream.finalMessage();
  const text  = final.content.map(b => (b.type === 'text' ? b.text : '')).join('');
  const json  = extractJsonBlock(text);
  yield { done: true, finalJson: json };
}

/** Extract the structured JSON the prompt asks Claude to append at the end. */
function extractJsonBlock(text: string): unknown {
  const match = text.match(/```json\s*([\s\S]*?)```/i);
  if (!match) return null;
  try { return JSON.parse(match[1]!); } catch { return null; }
}
