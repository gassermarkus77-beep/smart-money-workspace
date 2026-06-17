# Crypto Spreads Telegram Bot

Бот моніторить basis spreads і funding rates на Binance 24/7 і шле тобі
повідомлення в Telegram, як тільки з'являється сигнал. Працює без браузера.

## Що ти отримаєш

Коли basis перевищить твій поріг, на телефон прилетить повідомлення:

```
🟢 BTC basis сигнал

Basis:   +0.456%  (perp > spot (контанго))
Funding: +0.0125% / 8h  (≈ +13.7% річн.)
Spot:    100,234.5000
Perp:    100,691.7400
Volume:  $1,234.5M / 24h

Дія (delta-neutral basis trade):
  • SHORT perp BTCUSDT (плече 1x)
  • LONG  spot BTCUSDT
  • Закрити коли |basis| < 0.1%
```

---

## Налаштування — крок за кроком

### Крок 1 — створити Telegram-бота через BotFather (2 хв)

1. Відкрий Telegram, знайди користувача **@BotFather**
2. Напиши йому `/start`, потім `/newbot`
3. Введи ім'я бота: щось типу `My Crypto Basis Alerts`
4. Введи username бота: має закінчуватись на `_bot`, наприклад `my_crypto_basis_bot`
5. BotFather пришле повідомлення з **HTTP API Token** — виглядає так:
   ```
   123456789:ABCdef1234ghIklmn5678opqRSTuvwx
   ```
   Скопіюй його, він знадобиться. **Нікому не показуй** — це ключ керування ботом.

### Крок 2 — отримати свій chat_id (1 хв)

1. У Telegram знайди користувача **@userinfobot**
2. Напиши йому `/start`
3. Він відповість твоїм ID — це число, наприклад `123456789`. Скопіюй.

### Крок 3 — активувати бота, написавши йому

Це **обов'язково**: знайди в Telegram свого новоствореного бота (по username), відкрий і натисни **Start** або напиши `/start`. Без цього бот не зможе писати тобі першим.

### Крок 4 — встановити залежності

```bash
cd crypto_telegram_bot
pip install -r requirements.txt
```

### Крок 5 — створити config.json

```bash
cp config.example.json config.json
```

Відкрий `config.json` в текстовому редакторі і встав свої значення:

```json
{
  "telegram": {
    "bot_token": "123456789:ABCdef1234ghIklmn5678opqRSTuvwx",
    "chat_id": "123456789"
  },
  ...
}
```

### Крок 6 — перевірити що все працює

Запусти тестове повідомлення:

```bash
python bot.py --test
```

Якщо в Telegram прийшло `✅ Crypto basis bot — тестове повідомлення` — все ОК.

Якщо ні — типові проблеми:
- Не натиснув `/start` боту → перейди до Кроку 3
- Неправильний token або chat_id → перевір ще раз
- Інтернет блокує Telegram → використай VPN

### Крок 7 — запустити моніторинг

```bash
python bot.py
```

Бот буде працювати в терміналі. Кожні 30 секунд перевіряє ринок, шле повідомлення коли є сигнал.

---

## Конфігурація — що міняти в config.json

| Параметр | Що означає | Default |
|---|---|---|
| `poll_interval_seconds` | Як часто перевіряти ринок | 30 |
| `basis_threshold_pct` | З якого \|basis\| шле сигнал | 0.3% |
| `min_volume_usd` | Мінімальний 24h обсяг (фільтр ліквідності) | $1M |
| `cooldown_minutes` | Не шле повторно по одному символу N хвилин | 60 |
| `symbols` | Список конкретних пар або `[]` для всіх | `[]` |
| `extreme_threshold_pct` | Понад це — сигнал маркується як 🔴 | 0.8% |
| `include_funding` | Показувати funding rate в повідомленні | true |
| `include_action_hint` | Показувати конкретну рекомендацію | true |

### Якщо хочеш моніторити тільки конкретні пари

В `symbols` додай тикери на Binance (точно як вони називаються там):

```json
"symbols": ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"]
```

Тоді бот ігноруватиме всі інші пари.

### Якщо хочеш менше / більше сигналів

- **Менше**: підніми `basis_threshold_pct` (наприклад до 0.5)
- **Більше**: знизь до 0.15-0.2 (буде багато шуму)
- **Менше спаму**: збільш `cooldown_minutes` до 120-240

---

## Де запускати бот, щоб він працював 24/7

Бот має працювати безперервно, інакше пропустиш сигнали. Варіанти:

### Варіант 1 — на твоєму комп'ютері (найпростіше)
Якщо комп завжди увімкнений, просто залиш термінал відкритим з `python bot.py`.
**Мінус**: вимкнув комп — бот не працює.

### Варіант 2 — Raspberry Pi (одноразово $50)
Купи Raspberry Pi, постав туди бот — працюватиме 24/7 і споживатиме 3W.

### Варіант 3 — безкоштовний хостинг
- **Render.com** — безкоштовний tier для невеликих процесів
- **Railway.app** — $5/міс
- **Fly.io** — безкоштовний tier
- **Oracle Cloud Free Tier** — повноцінна VM безкоштовно назавжди

### Варіант 4 — VPS за $4-5/міс
DigitalOcean / Hetzner / Vultr — мінімальний droplet:
```bash
ssh root@your-vps-ip
git clone your-repo
cd crypto_telegram_bot
pip install -r requirements.txt
cp config.example.json config.json   # відредагуй
nohup python bot.py > bot.log 2>&1 &
```

---

## Команди

```bash
# Звичайний запуск
python bot.py

# Тест Telegram (1 повідомлення → вихід)
python bot.py --test

# Без Telegram, тільки виводить у консоль (для відлагодження)
python bot.py --dry-run

# З іншим конфігом
python bot.py --config my_other_config.json
```

---

## Безпека

- **`config.json` НЕ комітиться в git** (захищено через `.gitignore`)
- **Bot token = повний контроль над ботом**. Не публікуй, не показуй, не зберігай у відкритих місцях
- Якщо випадково засвітив токен — у BotFather зроби `/revoke` і отримай новий
- Бот **тільки шле повідомлення** — він НЕ має доступу до твого Binance і не може торгувати

---

## Типові проблеми

| Проблема | Рішення |
|---|---|
| `403 Forbidden: bot can't initiate conversation` | Не натиснув `/start` боту — крок 3 |
| `401 Unauthorized` | Невірний bot_token |
| `Bad Request: chat not found` | Невірний chat_id (взяв чужий?) |
| Бот не шле, але показує "Tick: X signals" | Всі сигнали на cooldown — почекай |
| Помилка `Connection timeout` | Інтернет / Binance блокує — спробуй VPN |
| Багато спаму | Підніми `basis_threshold_pct` або `cooldown_minutes` |

---

## Що додати наступним кроком

- Telegram **кнопки** для quick actions (наприклад "Snooze 1h", "Mute symbol")
- Підтримка **Bybit, OKX** (cross-exchange арбітраж)
- Окремі сповіщення про **stablecoin depeg**
- Daily summary — раз на день звіт про всі сигнали і "якби входив завжди — заробив би X"
