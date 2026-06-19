import { describe, it, expect } from 'vitest';
import { compile } from '../compiler';

describe('FinScript compiler', () => {
  it('compiles a minimal indicator header', () => {
    const src = `indicator("Hello", overlay=true)`;
    const out = compile(src);
    expect(out.ast.header.kind).toBe('indicator');
    expect(out.ast.header.title).toBe('Hello');
    expect(out.ast.header.options).toEqual({ overlay: true });
    expect(out.code).toContain('export const meta');
    expect(out.code).toContain('export function run');
  });

  it('compiles inputs and emits ta calls', () => {
    const src = `indicator("MA", overlay=true)
length = input.int(14, title="Length")
plot(ta.sma(close, length), title="SMA")`;
    const out = compile(src);
    expect(out.code).toContain('ta.sma');
    expect(out.code).toContain('plot(');
    expect(out.inputs.length).toBe(1);
    expect(out.inputs[0]!.type).toBe('int');
    expect(out.inputs[0]!.default).toBe(14);
  });

  it('handles crossover + alertcondition', () => {
    const src = `indicator("X")
fast = ta.ema(close, 9)
slow = ta.ema(close, 21)
bull = ta.crossover(fast, slow)
alertcondition(bull, title="Bull cross", message="Fast crossed up Slow")`;
    const out = compile(src);
    expect(out.code).toContain('ta.crossover');
    expect(out.code).toContain('alertcondition(');
  });
});
