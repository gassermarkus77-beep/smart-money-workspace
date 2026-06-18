// ============================================================================
// LLM-powered commentary upgrade
//
// The scenario builder produces a plain-text narrative + risk warning. This
// module asks Claude Opus 4.8 to rewrite both into institutional-style prose
// while preserving every numeric fact verbatim (entry zone, stop, targets,
// RR, confidence). The prompt is structured so the model returns JSON with
// `headline`, `narrative_md`, `risk_warning_md`; we never use free-form text
// straight from the model in case structure drifts.
// ============================================================================

import Anthropic from '@anthropic-ai/sdk';
import type { Scenario } from '../types.js';
import { commentarySystemPrompt, commentaryUserPrompt } from '../prompts/scenario.js';

const ANALYSIS_MODEL = process.env['ANTHROPIC_MODEL_ANALYSIS'] ?? 'claude-opus-4-8';

const client = process.env['ANTHROPIC_API_KEY']
  ? new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] })
  : null;

export interface UpgradedCommentary {
  headline: string;
  narrativeMarkdown: string;
  riskWarningMarkdown: string;
}

/** Returns the original commentary if the LLM is unavailable or fails. */
export async function upgradeCommentary(scenario: Scenario): Promise<UpgradedCommentary> {
  const fallback: UpgradedCommentary = {
    headline: scenario.headline,
    narrativeMarkdown: scenario.narrativeMarkdown,
    riskWarningMarkdown: scenario.riskWarningMarkdown,
  };

  if (!client) return fallback;

  try {
    const msg = await client.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 900,
      system: commentarySystemPrompt(),
      messages: [{ role: 'user', content: commentaryUserPrompt(scenario) }],
    });

    const text = msg.content.map(c => (c.type === 'text' ? c.text : '')).join('');
    const json = extractJsonBlock(text);
    if (!json) return fallback;

    const parsed = json as Partial<UpgradedCommentary>;
    return {
      headline: parsed.headline ?? fallback.headline,
      narrativeMarkdown: parsed.narrativeMarkdown ?? fallback.narrativeMarkdown,
      riskWarningMarkdown: parsed.riskWarningMarkdown ?? fallback.riskWarningMarkdown,
    };
  } catch {
    return fallback;
  }
}

function extractJsonBlock(text: string): unknown {
  const m = text.match(/```json\s*([\s\S]*?)```/i);
  if (!m) return null;
  try { return JSON.parse(m[1]!); } catch { return null; }
}
