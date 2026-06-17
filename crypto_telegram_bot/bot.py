"""
Crypto Spreads Telegram Bot
============================

Monitors Binance USDT perpetual basis spreads + funding rates and
pushes Telegram alerts whenever a configured threshold is crossed.

Run:
    pip install -r requirements.txt
    cp config.example.json config.json   # then edit it
    python bot.py

Optional dry-run (prints to console, no Telegram messages):
    python bot.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

# Bybit API: works from cloud datacenters (GitHub Actions, AWS, Azure).
# Binance geo-blocks many cloud regions, so we use Bybit by default.
# Both provide the same basis trading data; Bybit even includes funding
# rate in the linear (perpetual) tickers response, saving a request.
SPOT_URL = "https://api.bybit.com/v5/market/tickers?category=spot"
LINEAR_URL = "https://api.bybit.com/v5/market/tickers?category=linear"
EXCHANGE_NAME = "Bybit"
TG_API = "https://api.telegram.org/bot{token}/sendMessage"


@dataclass
class Signal:
    symbol: str
    basis_pct: float
    funding_pct: float
    funding_annualized_pct: float
    spot_price: float
    perp_price: float
    volume_usd: float
    is_extreme: bool


def load_config(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(
            f"Config not found: {path}\n"
            f"Copy config.example.json to config.json and fill in your Telegram bot token and chat ID."
        )
    cfg = json.loads(path.read_text())
    # Env vars override config secrets — used by GitHub Actions
    env_token = os.getenv("TELEGRAM_BOT_TOKEN")
    env_chat = os.getenv("TELEGRAM_CHAT_ID")
    if env_token:
        cfg["telegram"]["bot_token"] = env_token
    if env_chat:
        cfg["telegram"]["chat_id"] = env_chat
    return cfg


def load_state(path: Path | None) -> dict[str, float]:
    if not path or not path.exists():
        return {}
    try:
        data = json.loads(path.read_text())
        return {k: float(v) for k, v in data.get("last_alert", {}).items()}
    except (json.JSONDecodeError, OSError, ValueError):
        return {}


def save_state(path: Path | None, last_alert: dict[str, float]) -> None:
    if not path:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"last_alert": last_alert}))


def run_tick(cfg: dict, last_alert: dict[str, float], token: str, chat_id: str,
             cooldown_sec: int, dry_run: bool) -> None:
    spot_map, fut_map = fetch_market_data()
    signals = compute_signals(spot_map, fut_map, cfg)
    now = time.time()
    new_signals = [
        s for s in signals
        if now - last_alert.get(s.symbol, 0) > cooldown_sec
    ]
    logging.info(
        "Tick: %d pairs scanned, %d signals, %d to send (others on cooldown)",
        len(fut_map), len(signals), len(new_signals),
    )
    for s in new_signals:
        msg = format_message(s, cfg)
        if send_telegram(token, chat_id, msg, dry_run):
            last_alert[s.symbol] = now
            logging.info("Sent: %s basis=%+.3f%%", s.symbol, s.basis_pct)


def _bybit_get(url: str) -> list[dict]:
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    if not isinstance(data, dict) or data.get("retCode") != 0:
        msg = data.get("retMsg") if isinstance(data, dict) else str(data)[:200]
        raise RuntimeError(f"Bybit API error: {msg}")
    return data["result"]["list"]


def fetch_market_data() -> tuple[dict, dict]:
    spot_list = _bybit_get(SPOT_URL)
    linear_list = _bybit_get(LINEAR_URL)
    spot_map = {s["symbol"]: s for s in spot_list if s["symbol"].endswith("USDT")}
    fut_map = {f["symbol"]: f for f in linear_list if f["symbol"].endswith("USDT")}
    return spot_map, fut_map


def compute_signals(spot_map: dict, fut_map: dict, cfg: dict) -> list[Signal]:
    threshold = cfg["monitoring"]["basis_threshold_pct"]
    extreme = cfg["alerts"]["extreme_threshold_pct"]
    min_volume = cfg["monitoring"]["min_volume_usd"]
    symbols_filter = set(cfg["monitoring"].get("symbols", []))

    out: list[Signal] = []
    for symbol, f in fut_map.items():
        if symbols_filter and symbol not in symbols_filter:
            continue
        sp = spot_map.get(symbol)
        if not sp:
            continue
        try:
            spot_price = float(sp["lastPrice"])
            perp_price = float(f["lastPrice"])
            volume = float(f["turnover24h"])  # Bybit: 24h turnover in quote currency (USDT)
            funding = float(f.get("fundingRate", 0)) * 100
        except (KeyError, ValueError):
            continue
        if not spot_price or not perp_price or volume < min_volume:
            continue
        basis = (perp_price / spot_price - 1) * 100
        if abs(basis) < threshold:
            continue
        out.append(
            Signal(
                symbol=symbol,
                basis_pct=basis,
                funding_pct=funding,
                funding_annualized_pct=funding * 3 * 365,
                spot_price=spot_price,
                perp_price=perp_price,
                volume_usd=volume,
                is_extreme=abs(basis) >= extreme,
            )
        )
    return out


def format_message(s: Signal, cfg: dict) -> str:
    direction = "perp > spot (контанго)" if s.basis_pct > 0 else "perp < spot (бэквордація)"
    emoji = "🔴" if s.is_extreme else "🟢"
    short_sym = s.symbol.replace("USDT", "")
    lines = [
        f"{emoji} <b>{short_sym}</b> basis сигнал",
        "",
        f"<b>Basis:</b>   {s.basis_pct:+.3f}%  ({direction})",
    ]
    if cfg["alerts"].get("include_funding", True):
        lines.append(
            f"<b>Funding:</b> {s.funding_pct:+.4f}% / 8h  (≈ {s.funding_annualized_pct:+.1f}% річн.)"
        )
    lines += [
        f"<b>Spot:</b>    {s.spot_price:,.4f}",
        f"<b>Perp:</b>    {s.perp_price:,.4f}",
        f"<b>Volume:</b>  ${s.volume_usd/1e6:,.1f}M / 24h",
    ]
    if cfg["alerts"].get("include_action_hint", True):
        lines.append("")
        if s.basis_pct > 0:
            lines += [
                "<b>Дія</b> (delta-neutral basis trade):",
                f"  • SHORT perp {s.symbol} (плече 1x)",
                f"  • LONG  spot {s.symbol}",
                "  • Закрити коли |basis| &lt; 0.1%",
            ]
        else:
            lines += [
                "<b>Дія</b>: бэквордація рідка, перевір funding rate.",
                "  Якщо funding негативний → можна LONG perp + SHORT spot (margin).",
                "  Якщо невпевнений — пропусти, чекай контанго.",
            ]
    return "\n".join(lines)


def send_telegram(token: str, chat_id: str, text: str, dry_run: bool = False) -> bool:
    if dry_run:
        print("\n--- DRY RUN (no Telegram message sent) ---")
        print(text)
        print("--- end ---\n")
        return True
    try:
        resp = requests.post(
            TG_API.format(token=token),
            json={"chat_id": chat_id, "text": text, "parse_mode": "HTML", "disable_web_page_preview": True},
            timeout=15,
        )
        if resp.status_code != 200:
            logging.error("Telegram error %s: %s", resp.status_code, resp.text)
            return False
        return True
    except requests.RequestException as e:
        logging.error("Telegram send failed: %s", e)
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Crypto basis Telegram bot")
    parser.add_argument("--config", default="config.json", help="Path to config file")
    parser.add_argument("--dry-run", action="store_true", help="Print to console instead of Telegram")
    parser.add_argument("--test", action="store_true", help="Send one test message and exit")
    parser.add_argument("--demo", action="store_true",
                        help="Send 3 example signal messages so you can preview the format")
    parser.add_argument("--once", action="store_true",
                        help="Run a single tick then exit (for cron / GitHub Actions)")
    parser.add_argument("--state-file", default=None,
                        help="JSON file to persist last_alert times across runs")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    cfg = load_config(Path(args.config))

    token = cfg["telegram"]["bot_token"]
    chat_id = str(cfg["telegram"]["chat_id"])
    interval = cfg["monitoring"]["poll_interval_seconds"]
    cooldown_sec = cfg["monitoring"]["cooldown_minutes"] * 60

    placeholders = ("PASTE_", "FROM_ENV", "")
    if any(p == token or token.startswith("PASTE_") for p in placeholders) or \
       any(p == chat_id or chat_id.startswith("PASTE_") for p in placeholders):
        sys.exit(
            "ERROR: Telegram credentials missing. Set bot_token/chat_id in config.json "
            "or via TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env vars."
        )

    if args.test:
        ok = send_telegram(
            token, chat_id,
            "✅ <b>Crypto basis bot — тестове повідомлення</b>\nЯкщо ти це бачиш — бот налаштований правильно.",
            args.dry_run,
        )
        sys.exit(0 if ok else 1)

    if args.demo:
        intro = (
            "🎭 <b>DEMO — приклади сигналів</b>\n"
            "Це фейкові дані щоб ти побачив як виглядають справжні сповіщення.\n"
            "Реальні сигнали прилетять самі, коли ринок дасть привід."
        )
        send_telegram(token, chat_id, intro, args.dry_run)
        examples = [
            Signal(  # 1) Звичайний сигнал контанго на BTC
                symbol="BTCUSDT", basis_pct=0.456, funding_pct=0.0125,
                funding_annualized_pct=0.0125 * 3 * 365,
                spot_price=100234.50, perp_price=100691.74,
                volume_usd=1_240_000_000, is_extreme=False,
            ),
            Signal(  # 2) Екстремум на середній альті
                symbol="SOLUSDT", basis_pct=1.234, funding_pct=0.0840,
                funding_annualized_pct=0.0840 * 3 * 365,
                spot_price=189.42, perp_price=191.76,
                volume_usd=420_000_000, is_extreme=True,
            ),
            Signal(  # 3) Бэквордація (рідко)
                symbol="ETHUSDT", basis_pct=-0.380, funding_pct=-0.0150,
                funding_annualized_pct=-0.0150 * 3 * 365,
                spot_price=3621.85, perp_price=3608.09,
                volume_usd=890_000_000, is_extreme=False,
            ),
        ]
        for s in examples:
            send_telegram(token, chat_id, format_message(s, cfg), args.dry_run)
        sys.exit(0)

    state_path = Path(args.state_file) if args.state_file else None
    last_alert = load_state(state_path)

    if args.once:
        logging.info(
            "Single-tick run. threshold=%.3f%% min_volume=$%.0fM cooldown=%dmin dry_run=%s state=%s",
            cfg["monitoring"]["basis_threshold_pct"],
            cfg["monitoring"]["min_volume_usd"] / 1e6,
            cfg["monitoring"]["cooldown_minutes"],
            args.dry_run,
            state_path,
        )
        try:
            run_tick(cfg, last_alert, token, chat_id, cooldown_sec, args.dry_run)
        except requests.RequestException as e:
            # Transient Binance issue — log and exit 0 so the workflow stays green
            logging.warning("Network error (will retry next run): %s", e)
            save_state(state_path, last_alert)
            return
        save_state(state_path, last_alert)
        return

    logging.info(
        "Bot started. threshold=%.3f%% min_volume=$%.0fM interval=%ds cooldown=%dmin dry_run=%s",
        cfg["monitoring"]["basis_threshold_pct"],
        cfg["monitoring"]["min_volume_usd"] / 1e6,
        interval,
        cfg["monitoring"]["cooldown_minutes"],
        args.dry_run,
    )

    while True:
        try:
            run_tick(cfg, last_alert, token, chat_id, cooldown_sec, args.dry_run)
            save_state(state_path, last_alert)
        except requests.RequestException as e:
            logging.warning("Network error: %s — retrying in %ds", e, interval)
        except Exception as e:
            logging.exception("Unexpected error: %s", e)
        time.sleep(interval)


if __name__ == "__main__":
    main()
