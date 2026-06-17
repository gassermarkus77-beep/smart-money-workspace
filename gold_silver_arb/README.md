# Gold/Silver Ratio Pairs Trading Backtest

Mean-reversion strategy on the Gold/Silver Ratio (GSR), traded as a
dollar-neutral pair using CME front-month futures (`GC=F` and `SI=F`).

## Logic

```
GSR = gold_price / silver_price
z   = (GSR - rolling_mean(252d)) / rolling_std(252d)

z >  +2.0  -> short GSR  (short gold leg, long silver leg)
z <  -2.0  -> long  GSR  (long  gold leg, short silver leg)
|z| < 0.5  -> exit
|z| > 3.5  -> stop out
```

Positions are sized so each leg is the same USD notional. A parallel
move in both metals cancels; profit comes from the spread reverting.

## Setup

```bash
cd gold_silver_arb
pip install -r requirements.txt
python backtest.py
```

## Output

The script writes to `gold_silver_arb/output/`:

- `backtest.csv`  — daily prices, GSR, z-score, position, equity curve
- `trades.csv`    — per-trade entry/exit dates, side, z-scores, return
- `backtest.png`  — GSR with bands, z-score with active positions, equity vs buy-and-hold gold

Console prints performance: total return, CAGR, Sharpe, max drawdown,
trade count, win rate, average win/loss, average holding days.

## Tuning

All parameters are CLI flags:

```bash
python backtest.py --start 2010-01-01 --entry-z 2.5 --exit-z 0.0 --lookback 180
```

| Flag          | Default      | Notes                                          |
| ------------- | ------------ | ---------------------------------------------- |
| `--start`     | `2015-01-01` | Data start date                                |
| `--end`       | today        | Data end date                                  |
| `--lookback`  | `252`        | Rolling window for mean/std (≈ 1 trading year) |
| `--entry-z`   | `2.0`        | Entry threshold in σ                           |
| `--exit-z`    | `0.5`        | Exit threshold (mean reversion target)         |
| `--stop-z`    | `3.5`        | Stop-out threshold                             |
| `--capital`   | `100000`     | Starting equity in USD                         |
| `--leg-pct`   | `0.5`        | Capital fraction per leg                       |
| `--fee-bps`   | `2.0`        | Round-trip fee per leg, basis points           |

## Caveats

- Continuous front-month futures from Yahoo include roll gaps that bias
  buy-and-hold but matter much less for a short-horizon pairs strategy.
- The backtest ignores overnight financing/swap costs. On CFDs these can
  materially eat into returns over multi-week holds; on CME futures
  there is no swap, only margin and exchange fees.
- Past GSR behaviour is not a guarantee. The 2020 COVID shock pushed GSR
  to ~125; an entry at z=2 in late 2019 would have drawn down hard before
  reverting. Size positions accordingly and respect the stop.
