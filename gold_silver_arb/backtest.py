"""
Gold/Silver Ratio Pairs Trading Backtest
=========================================

Strategy:
    GSR = Gold price / Silver price
    z   = (GSR - rolling_mean) / rolling_std

    z >  entry_z  -> SHORT gold, LONG silver  (GSR too high, expect mean reversion down)
    z < -entry_z  -> LONG  gold, SHORT silver (GSR too low,  expect mean reversion up)
    |z| < exit_z  -> close position
    |z| > stop_z  -> stop out

Position sizing is dollar-neutral: equal USD on each leg, so a parallel
move in both metals nets to ~0 PnL. Profit comes from the spread converging.

Run:
    pip install -r requirements.txt
    python backtest.py
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import yfinance as yf


@dataclass
class Params:
    start: str = "2015-01-01"
    end: str | None = None
    lookback: int = 252          # rolling window for mean/std (1 trading year)
    entry_z: float = 2.0
    exit_z: float = 0.5
    stop_z: float = 3.5
    capital: float = 100_000.0   # starting equity in USD
    leg_pct: float = 0.5         # fraction of equity per leg (0.5 = 50% on each)
    fee_bps: float = 2.0         # round-trip fee per leg, in basis points
    gold_ticker: str = "GC=F"    # CME gold front-month continuous
    silver_ticker: str = "SI=F"  # CME silver front-month continuous


def load_prices(p: Params) -> pd.DataFrame:
    print(f"Downloading {p.gold_ticker} and {p.silver_ticker} from {p.start}...")
    gold = yf.download(p.gold_ticker, start=p.start, end=p.end, progress=False, auto_adjust=True)["Close"]
    silver = yf.download(p.silver_ticker, start=p.start, end=p.end, progress=False, auto_adjust=True)["Close"]
    df = pd.concat([gold, silver], axis=1, keys=["gold", "silver"]).dropna()
    df.columns = ["gold", "silver"]
    if df.empty:
        raise RuntimeError("No data returned from Yahoo. Check network / tickers, or run with --synthetic.")
    print(f"Loaded {len(df)} trading days: {df.index[0].date()} -> {df.index[-1].date()}")
    return df


def synthetic_prices(p: Params, seed: int = 42) -> pd.DataFrame:
    """Generate plausible gold/silver paths so the strategy can be inspected
    without network access. Both metals share a common factor (precious-metals
    beta) plus idiosyncratic noise, producing a mean-reverting GSR."""
    rng = np.random.default_rng(seed)
    dates = pd.bdate_range(start=p.start, end=p.end or "2025-06-01")
    n = len(dates)
    common = rng.normal(0.0003, 0.010, n)
    gold_idio = rng.normal(0.0, 0.006, n)
    silver_idio = rng.normal(0.0, 0.012, n)
    # Slow oscillation in relative drift makes the ratio wander and revert
    osc = 0.0005 * np.sin(np.linspace(0, 8 * np.pi, n))
    gold_ret = common + gold_idio - osc
    silver_ret = 1.3 * common + silver_idio + osc
    gold = 1200 * np.exp(np.cumsum(gold_ret))
    silver = 16 * np.exp(np.cumsum(silver_ret))
    df = pd.DataFrame({"gold": gold, "silver": silver}, index=dates)
    print(f"Synthetic data: {len(df)} days {df.index[0].date()} -> {df.index[-1].date()}")
    return df


def build_signals(df: pd.DataFrame, p: Params) -> pd.DataFrame:
    df = df.copy()
    df["gsr"] = df["gold"] / df["silver"]
    df["mean"] = df["gsr"].rolling(p.lookback).mean()
    df["std"] = df["gsr"].rolling(p.lookback).std()
    df["z"] = (df["gsr"] - df["mean"]) / df["std"]

    # Position state machine: +1 = long GSR (long gold, short silver),
    #                        -1 = short GSR (short gold, long silver), 0 = flat
    pos = np.zeros(len(df))
    state = 0
    for i, z in enumerate(df["z"].values):
        if np.isnan(z):
            pos[i] = 0
            continue
        if state == 0:
            if z >= p.entry_z:
                state = -1   # GSR high -> short GSR
            elif z <= -p.entry_z:
                state = 1    # GSR low  -> long GSR
        else:
            # Exit on mean reversion or stop-out
            if abs(z) <= p.exit_z:
                state = 0
            elif state == 1 and z <= -p.stop_z:
                state = 0
            elif state == -1 and z >= p.stop_z:
                state = 0
        pos[i] = state
    df["position"] = pos
    return df


def run_backtest(df: pd.DataFrame, p: Params) -> tuple[pd.DataFrame, list[dict]]:
    df = df.copy()
    gold_ret = df["gold"].pct_change().fillna(0.0)
    silver_ret = df["silver"].pct_change().fillna(0.0)

    # Trade on the next bar's open after a signal change (use prior position for today's PnL)
    held = df["position"].shift(1).fillna(0.0)

    # Dollar-neutral: +1 GSR = long gold leg + short silver leg
    daily_ret = held * p.leg_pct * (gold_ret - silver_ret)

    # Trading costs: charged on position changes (entry + exit), 2 legs each
    fee_per_change = 2.0 * (p.fee_bps / 10_000.0) * p.leg_pct
    changes = df["position"].diff().abs().fillna(0.0)
    daily_ret = daily_ret - changes * fee_per_change

    df["ret"] = daily_ret
    df["equity"] = p.capital * (1.0 + daily_ret).cumprod()

    # Extract trades
    trades: list[dict] = []
    entry_idx: int | None = None
    entry_side = 0
    for i in range(len(df)):
        side = int(df["position"].iloc[i])
        if entry_idx is None and side != 0:
            entry_idx = i
            entry_side = side
        elif entry_idx is not None and side == 0:
            seg = df.iloc[entry_idx : i + 1]
            trade_ret = (1.0 + seg["ret"]).prod() - 1.0
            trades.append(
                {
                    "entry_date": df.index[entry_idx].date(),
                    "exit_date": df.index[i].date(),
                    "side": "long_GSR" if entry_side == 1 else "short_GSR",
                    "days": (df.index[i] - df.index[entry_idx]).days,
                    "entry_z": float(df["z"].iloc[entry_idx]),
                    "exit_z": float(df["z"].iloc[i]),
                    "return_pct": trade_ret * 100,
                }
            )
            entry_idx = None
            entry_side = 0
    return df, trades


def metrics(df: pd.DataFrame, trades: list[dict], p: Params) -> dict:
    r = df["ret"].dropna()
    eq = df["equity"].dropna()
    years = (df.index[-1] - df.index[0]).days / 365.25
    total_ret = eq.iloc[-1] / p.capital - 1.0
    cagr = (eq.iloc[-1] / p.capital) ** (1 / years) - 1.0 if years > 0 else 0.0
    sharpe = (r.mean() / r.std()) * np.sqrt(252) if r.std() > 0 else 0.0
    drawdown = (eq / eq.cummax() - 1.0).min()
    wins = [t for t in trades if t["return_pct"] > 0]
    win_rate = len(wins) / len(trades) if trades else 0.0
    avg_win = np.mean([t["return_pct"] for t in wins]) if wins else 0.0
    losses = [t for t in trades if t["return_pct"] <= 0]
    avg_loss = np.mean([t["return_pct"] for t in losses]) if losses else 0.0
    avg_days = np.mean([t["days"] for t in trades]) if trades else 0.0
    return {
        "years": round(years, 2),
        "total_return_pct": round(total_ret * 100, 2),
        "cagr_pct": round(cagr * 100, 2),
        "sharpe": round(sharpe, 2),
        "max_drawdown_pct": round(drawdown * 100, 2),
        "trades": len(trades),
        "win_rate_pct": round(win_rate * 100, 1),
        "avg_win_pct": round(avg_win, 2),
        "avg_loss_pct": round(avg_loss, 2),
        "avg_holding_days": round(avg_days, 1),
    }


def plot_results(df: pd.DataFrame, out_dir: Path, p: Params) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    fig, axes = plt.subplots(3, 1, figsize=(13, 11), sharex=True)

    axes[0].plot(df.index, df["gsr"], label="Gold/Silver Ratio", color="goldenrod")
    axes[0].plot(df.index, df["mean"], label=f"{p.lookback}d mean", color="black", linewidth=0.8)
    axes[0].fill_between(df.index, df["mean"] - p.entry_z * df["std"], df["mean"] + p.entry_z * df["std"],
                         alpha=0.15, color="gray", label=f"±{p.entry_z}σ")
    axes[0].set_title("Gold/Silver Ratio with entry bands")
    axes[0].legend(loc="upper left")
    axes[0].grid(alpha=0.3)

    axes[1].plot(df.index, df["z"], label="z-score", color="steelblue")
    axes[1].axhline(p.entry_z, color="red", linestyle="--", alpha=0.6)
    axes[1].axhline(-p.entry_z, color="green", linestyle="--", alpha=0.6)
    axes[1].axhline(0, color="black", linewidth=0.6)
    longs = df.index[df["position"] == 1]
    shorts = df.index[df["position"] == -1]
    axes[1].fill_between(df.index, -p.stop_z, p.stop_z, where=df["position"] == 1, alpha=0.15, color="green",
                         label="Long GSR")
    axes[1].fill_between(df.index, -p.stop_z, p.stop_z, where=df["position"] == -1, alpha=0.15, color="red",
                         label="Short GSR")
    axes[1].set_title("z-score and active positions")
    axes[1].legend(loc="upper left")
    axes[1].grid(alpha=0.3)

    axes[2].plot(df.index, df["equity"], label="Strategy equity", color="darkgreen")
    bh = p.capital * (df["gold"] / df["gold"].iloc[0])
    axes[2].plot(df.index, bh, label="Buy & hold gold", color="goldenrod", alpha=0.6)
    axes[2].set_title("Equity curve")
    axes[2].legend(loc="upper left")
    axes[2].grid(alpha=0.3)

    plt.tight_layout()
    path = out_dir / "backtest.png"
    plt.savefig(path, dpi=120)
    print(f"Saved chart: {path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Gold/Silver pairs trading backtest")
    parser.add_argument("--start", default="2015-01-01")
    parser.add_argument("--end", default=None)
    parser.add_argument("--lookback", type=int, default=252)
    parser.add_argument("--entry-z", type=float, default=2.0)
    parser.add_argument("--exit-z", type=float, default=0.5)
    parser.add_argument("--stop-z", type=float, default=3.5)
    parser.add_argument("--capital", type=float, default=100_000.0)
    parser.add_argument("--leg-pct", type=float, default=0.5)
    parser.add_argument("--fee-bps", type=float, default=2.0)
    parser.add_argument("--out", default="output")
    parser.add_argument("--synthetic", action="store_true",
                        help="Use simulated data instead of Yahoo (offline demo)")
    args = parser.parse_args()

    p = Params(
        start=args.start, end=args.end, lookback=args.lookback,
        entry_z=args.entry_z, exit_z=args.exit_z, stop_z=args.stop_z,
        capital=args.capital, leg_pct=args.leg_pct, fee_bps=args.fee_bps,
    )

    prices = synthetic_prices(p) if args.synthetic else load_prices(p)
    sig = build_signals(prices, p)
    bt, trades = run_backtest(sig, p)
    m = metrics(bt, trades, p)

    print("\n=== Performance ===")
    for k, v in m.items():
        print(f"  {k:<22} {v}")

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    bt.to_csv(out_dir / "backtest.csv")
    pd.DataFrame(trades).to_csv(out_dir / "trades.csv", index=False)
    print(f"\nSaved: {out_dir/'backtest.csv'} and {out_dir/'trades.csv'}")

    plot_results(bt, out_dir, p)


if __name__ == "__main__":
    main()
