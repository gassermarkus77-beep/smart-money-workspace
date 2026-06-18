# FinScript v1 — Language Specification

> Proprietary indicator scripting language for FINBERG MARKETS.
> Pine-Script-class, but compiles to standard ES2022 sandboxed in a Web Worker.

---

## 1. Design Goals

1. **Familiar** — Pine-Script users productive within an hour.
2. **Safe** — sandboxed execution, no `eval`, no DOM access, no network.
3. **Deterministic** — pure functions only; same input → same output.
4. **Streamable** — same code runs on history (vectorized) and on live ticks (incremental).
5. **Composable** — scripts can import other published scripts (libraries).

---

## 2. Lexical Structure

- Comments: `//` line and `/* ... */` block
- Identifiers: `[A-Za-z_][A-Za-z0-9_]*`
- Numbers: `123`, `3.14`, `1.2e3`, `0x1F`
- Strings: `"double"` and `'single'` (no interpolation in v1)
- Booleans: `true`, `false`
- `na` represents missing/undefined.

---

## 3. Types

| Type | Notes |
|---|---|
| `int` | 64-bit |
| `float` | IEEE 754 double |
| `bool` | |
| `string` | UTF-8 |
| `color` | `color.new(r,g,b,a)` or `color.<name>` |
| `series<T>` | implicit; any expression evaluated per bar |
| `array<T>` | mutable typed list |
| `map<K,V>` | hashmap |

Type inference is local; declarations are optional.

---

## 4. Script Header

Every script must begin with:

```finscript
//@version=1
indicator("My Indicator", overlay=true, max_bars_back=500)
// or
strategy("My Strategy", overlay=true, initial_capital=10000)
```

---

## 5. Built-in Variables

| Variable | Type | Description |
|---|---|---|
| `open` `high` `low` `close` `volume` | series<float> | Current bar OHLCV |
| `time` | series<int> | Bar timestamp (ms UTC) |
| `bar_index` | series<int> | 0-based |
| `na` | any | Missing |
| `last_bar_index` | int | Index of last bar in current dataset |

---

## 6. Standard Library (excerpt)

```
ta.sma(source, length)              → series<float>
ta.ema(source, length)              → series<float>
ta.rsi(source, length)              → series<float>
ta.macd(source, fast, slow, signal) → {macd, signal, hist}
ta.atr(length)                      → series<float>
ta.highest(source, length)          → series<float>
ta.lowest(source, length)           → series<float>
ta.crossover(a, b)                  → series<bool>
ta.crossunder(a, b)                 → series<bool>
ta.change(source, length=1)         → series<float>

math.abs / math.max / math.min / math.round / math.log / math.exp / math.pow
math.sqrt / math.sign / math.floor / math.ceil

input.int(default, title)
input.float(default, title)
input.bool(default, title)
input.string(default, title, options=[...])
input.color(default, title)
input.source(default, title)        // returns series — close/open/high/low/hl2/hlc3/ohlc4

plot(value, title, color=color.blue, linewidth=1, style=plot.style_line)
plotshape(condition, location=location.abovebar, style=shape.triangleup, color=color.green)
plotcandle(open, high, low, close)
hline(price, color=color.gray)
fill(plot1, plot2, color=color.new(color.blue, 80))

alert(message)
alertcondition(condition, title, message)
```

---

## 7. Strategies (Phase 4)

```finscript
strategy("Trend Cross", overlay=true)

fastLen = input.int(9)
slowLen = input.int(21)
fast = ta.ema(close, fastLen)
slow = ta.ema(close, slowLen)

if ta.crossover(fast, slow)
    strategy.entry("Long",  strategy.long)
if ta.crossunder(fast, slow)
    strategy.close("Long")
```

---

## 8. Execution Model

- A script is compiled once per session.
- For **history**: runs left-to-right over every bar.
- For **live**: re-evaluates the current forming bar on each tick (`barstate.isconfirmed` becomes true at bar close).
- All series-state is automatically captured in a hidden state vector — no manual indexing required.

---

## 9. Sandbox

- Compiled output executes in a dedicated Web Worker
- No access to `window`, `document`, `fetch`, `XMLHttpRequest`, `WebSocket`
- Execution time per bar capped at 5ms; exceeded → script disabled
- Memory cap: 32 MiB per script

---

## 10. Compilation Pipeline

```
source.fs
  │
  ▼  Lexer    (lexer.ts)
tokens
  │
  ▼  Parser   (parser.ts)
AST
  │
  ▼  Validator (semantics, types, sandbox rules)
typed AST
  │
  ▼  Transpiler (emit.ts)
ES2022 module
  │
  ▼  Runtime  (runtime.ts — provides ta.*, math.*, plot, etc.)
indicator instance
```

See `src/` for the reference implementation skeleton.
