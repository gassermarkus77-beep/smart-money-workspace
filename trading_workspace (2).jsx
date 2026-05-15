import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { LayoutDashboard, CheckSquare, BookOpen, BookMarked, Shield, Calendar, BarChart3, Brain, Plus, Trash2, Edit3, Save, X, TrendingUp, TrendingDown, AlertCircle, Target, DollarSign, Activity, Calculator, ChevronRight, Settings, Download, Upload, Filter } from 'lucide-react';

// ============= STORAGE HELPERS =============
const storage = {
  async get(key, defaultValue) {
    try {
      const result = await window.storage.get(key);
      return result ? JSON.parse(result.value) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  async set(key, value) {
    try {
      await window.storage.set(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
};

// ============= DEFAULTS =============
const DEFAULT_SETTINGS = {
  accountSize: 15000,
  currency: '$',
  riskPerTradePct: 0.5,
  maxDailyRiskPct: 2,
  maxDrawdownPct: 5,
  weeklyRiskPct: 5
};

const DEFAULT_WATCHLIST_FX = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'];
const DEFAULT_WATCHLIST_IDX = ['NAS100', 'US30'];

const DEFAULT_RULES = [
  'Не торгую без HTF narrative',
  'Тільки A+ сетапи з PD Array (Premium/Discount)',
  'Killzones only: LO 09:00-12:00 / NY 14:00-17:00',
  'Після 2 SL поспіль — стоп на день',
  'BE при +1R, частковий тейк при TP1',
  'Не торгую за 30 хв до новин (NFP, FOMC, CPI)',
  'Журнал заповнюю одразу після угоди',
  'Не доливаюсь в збиток. Ніколи.'
];

const DEFAULT_GOALS = [
  { id: 1, text: 'Win Rate ≥ 50% за місяць', done: false },
  { id: 2, text: 'Avg R:R ≥ 2.5', done: false },
  { id: 3, text: 'Profit Factor ≥ 1.8', done: false },
  { id: 4, text: 'Журнал на 100% угод', done: false }
];

// ============= CHECKLIST DATA =============
const CHECKLISTS = {
  daily_bias: {
    title: 'Daily Bias',
    icon: '🎯',
    description: 'Визначення напрямку дня перед сесією',
    items: [
      'Подивився Weekly: в якій фазі ринок?',
      'Подивився Daily: бичий / ведмежий / range?',
      'Знайшов ключові пули: PMH/PML, PWH/PWL, PDH/PDL',
      'Визначив рівень NYM (New York Midnight Open)',
      'Сформулював гіпотезу А (основна) і Б (альтернативна)',
      'Записав bias одним реченням'
    ]
  },
  liquidity: {
    title: 'Liquidity',
    icon: '💧',
    description: 'Аналіз пулів ліквідності та куди йде ціна',
    items: [
      'Визначив BSL (Buyside Liquidity) — стопи зверху',
      'Визначив SSL (Sellside Liquidity) — стопи знизу',
      'Які пули External (зовнішні), які Internal (внутрішні)?',
      'Найближча незняті ліквідність визначена',
      'Зрозуміла куди ціна цілиться (наступний пул)',
      'Я НЕ входжу В пул — я входжу ПІСЛЯ raid'
    ]
  },
  bos_mss: {
    title: 'BOS / MSS',
    icon: '📐',
    description: 'Слом структури — підтвердження напрямку',
    items: [
      'Бачу чіткий swing high / swing low',
      'Стався слом структури тілом, не тінню',
      'Це Real MS (узгоджений з HTF), не Fake',
      'Слом стався ПІСЛЯ захоплення ліквідності',
      'Структури на 2+ ТФ синхронізовані',
      'Після MSS утворився FVG в напрямку слому'
    ]
  },
  ob_fvg: {
    title: 'OB / FVG',
    icon: '🟦',
    description: 'Точки інтересу — Order Block та Fair Value Gap',
    items: [
      'Order Block узгоджений з Order Flow',
      'Поруч з OB є FVG',
      'OB знаходиться в Discount (для лонгу) / Premium (для шорту)',
      'Перед OB був захоплений пул ліквідності',
      'Обрав підхід: агресивний АБО консервативний',
      'OB не пробитий тілом — рівень уважений'
    ]
  },
  premium_discount: {
    title: 'Premium / Discount',
    icon: '⚖️',
    description: 'Ціна дорога чи дешева? PD Array',
    items: [
      'Намалював Dealing Range (Fibonacci)',
      'Налаштування Fib: 0; 0.5; 0.62; 0.705; 0.79; 1',
      'Визначив де Equilibrium (50%)',
      'Для лонгу — ціна в Discount (нижче 50%)',
      'Для шорту — ціна в Premium (вище 50%)',
      'OTE зона (0.62-0.79) як додатковий тригер'
    ]
  },
  session_timing: {
    title: 'Session Timing',
    icon: '⏰',
    description: 'Час торгівлі — killzones',
    items: [
      'Я в killzone (LO 09-12 / NY 14-17 UTC+3)',
      'Або в Optimal Trader Time (10:00-11:30 / 15:00-17:00)',
      'Я НЕ входжу перед закриттям сесії',
      'Я НЕ входжу за 30 хв до red folder news',
      'Це не п\'ятниця після 18:00',
      'Сесія розвивається за моєю гіпотезою'
    ]
  },
  entry_confirmation: {
    title: 'Entry Confirmation',
    icon: '✅',
    description: 'Фінальне підтвердження перед натисканням кнопки',
    items: [
      'Raid (захоплення ліквідності) стався',
      'MSS на LTF підтвердив напрямок',
      'FVG на LTF утворився після MSS',
      'Ціна повернулась в LTF POI',
      'Тригер свічки видно (engulfing / pin / closure)',
      'Стоп логічний, не «на око»'
    ]
  },
  news_filter: {
    title: 'News Filter',
    icon: '📰',
    description: 'Перевірка новинного фону',
    items: [
      'Перевірив Forex Factory / Investing на сьогодні',
      'Немає red folder news в найближчі 60 хвилин',
      'Знаю час NFP / FOMC / CPI цього тижня',
      'Якщо новини — позиція закрита або зменшена',
      'Не торгую в перші 15 хв після новин (волатильність)',
      'Не «вгадую» напрям руху на новинах'
    ]
  },
  rr_confirmation: {
    title: 'R:R Confirmation',
    icon: '⚙️',
    description: 'Перевірка співвідношення ризик/винагорода',
    items: [
      'Розмір позиції розрахований під 0.5-1% ризику',
      'Стоп на логічному місці (за свінгом/POI)',
      'Ціль = наступний пул ліквідності',
      'R:R ≥ 1:2 (мінімум)',
      'R:R ≥ 1:3 для повного розміру',
      'План часткового тейку при +1R готовий'
    ]
  }
};

// ============= PLAYBOOK DATA =============
const PLAYBOOK = [
  {
    id: 'liquidity_sweep',
    name: 'Liquidity Sweep',
    type: 'Reversal',
    description: 'Класична модель ICT. Ціна заходить за ключовий рівень ліквідності (PDH/PDL/PWH/PWL), захоплює стопи, потім швидко повертається. Після зняття ліквідності — слом структури і вхід у зворотному напрямку.',
    rules: [
      'Має бути ЧІТКИЙ пул ліквідності перед заходом',
      'Sweep + повернення в межах однієї-двох свічок (на LTF)',
      'Обов\'язково MSS на LTF після sweep',
      'Вхід тільки після FVG або OB на ретесті',
      'Stop loss — за тінню sweep свічки'
    ],
    dontTrade: [
      'Якщо немає чіткого пулу ліквідності',
      'Якщо sweep без подальшого MSS — це може бути просто продовження',
      'Якщо ціна довго тримається за рівнем (не швидкий return)',
      'Проти HTF narrative — це найчастіша помилка',
      'Без killzone — не торгуєш'
    ],
    confirmation: [
      'Захоплення пулу ліквідності',
      'Швидке повернення (sweep candle)',
      'MSS на LTF (5M/1M)',
      'FVG/OB на ретесті',
      'Killzone активна'
    ],
    examples: 'Asia high captured at LO open, потім reversal вниз через NY KZ.'
  },
  {
    id: 'london_manipulation',
    name: 'London Manipulation',
    type: 'Reversal/Continuation',
    description: 'Класичний ICT-патерн. Лондонська сесія робить маніпуляцію вище/нижче Asia range, захоплює ліквідність — потім реальний рух починається в NY. Цей сетап працює завдяки тому, що London — це часто фейк, а NY — це справжня доставка.',
    rules: [
      'Asia має бути в чіткому діапазоні (не trending)',
      'London робить sweep Asia High або Asia Low',
      'Після sweep — повернення в Asia range',
      'NY KZ підтверджує напрямок через MSS',
      'Вхід під час NY KZ, не на самому sweep'
    ],
    dontTrade: [
      'Asia trended — тоді London продовжить, а не маніпулюватиме',
      'Якщо London пробив Asia з імпульсом — це не маніпуляція',
      'Якщо немає reaction від Asia HTF POI',
      'У дні великих новин (NFP) — модель ламається',
      'Проти HTF narrative'
    ],
    confirmation: [
      'Asia range визначений',
      'London sweep Asia high/low',
      'Швидкий return в range',
      'NY KZ підтверджує MSS',
      'Є HTF POI в напрямку'
    ],
    examples: 'EURUSD: Asia рейндж 1.0850-1.0870. LO робить high 1.0875 (sweep), повертається. NY іде вниз до 1.0820.'
  },
  {
    id: 'ny_reversal',
    name: 'NY Reversal',
    type: 'Reversal',
    description: 'NY сесія часто реверсить рух London. Якщо ціна сильно зросла в LO, у NY можливий розворот вниз (і навпаки). Особливо часто на NYO (New York Open) о 14:30 UTC+3.',
    rules: [
      'London дав сильний directional рух',
      'Ціна підійшла до HTF POI на 4H/1H',
      'NYO формує дзеркальний рух',
      'MSS на LTF підтверджує розворот',
      'Цільова зона — повернення до точки початку LO move'
    ],
    dontTrade: [
      'London рух був помірним — реверсу може не бути',
      'HTF narrative сильно проти reversal',
      'Немає чіткого HTF POI'
    ],
    confirmation: [
      'Сильний LO move',
      'Контакт з HTF POI',
      'MSS на NY open',
      'FVG в зворотному напрямку',
      'Killzone NY активна'
    ],
    examples: 'NAS100: LO зросло на 1.5%, доторкнулось до Weekly OB. NYO формує bearish MSS, цілі — нижче LO open.'
  },
  {
    id: 'ob_continuation',
    name: 'OB Continuation',
    type: 'Continuation',
    description: 'Класичний continuation сетап. Тренд активний, ціна повертається до Order Block (untested), reacts і продовжує тренд. Один з найнадійніших сетапів за умови підтвердження.',
    rules: [
      'Чіткий тренд на HTF (мінімум 2 BOS)',
      'Untested OB в Discount (для uptrend) / Premium (для downtrend)',
      'OB узгоджений з Order Flow',
      'Ціна торкається OB і реагує',
      'MSS на LTF в напрямку тренду'
    ],
    dontTrade: [
      'Тренд слабкий або в exhaustion',
      'OB вже був протестований',
      'OB проти Order Flow',
      'Ціна пробиває OB тілом',
      'Сильний divergence з SMT'
    ],
    confirmation: [
      'Чіткий HTF тренд',
      'Untested OB',
      'Reaction від OB',
      'LTF MSS',
      'FVG в напрямку'
    ],
    examples: 'GBPUSD у uptrend. Pullback до 4H bullish OB на 1.2750. Bullish MSS на 5M → лонг, ціль — попередній HH.'
  },
  {
    id: 'smt_divergence',
    name: 'SMT Divergence',
    type: 'Reversal Filter',
    description: 'Smart Money Tool divergence. Корельовані пари / індекси не оновлюють екстремум одночасно. Наприклад: EURUSD робить нижчий low, а GBPUSD — НЕ робить. Це сигнал слабкості ведмежого руху.',
    rules: [
      'Корельовані інструменти (EURUSD vs GBPUSD, NAS100 vs SPX500)',
      'Один робить HH/LL, другий — НЕ робить',
      'Дивергенція на ключовому рівні',
      'Чекаєш підтвердження через MSS',
      'Використовуй як ФІЛЬТР, не самостійний сигнал'
    ],
    dontTrade: [
      'Інструменти слабко корельовані',
      'Дивергенція в середині рейнджу',
      'Без додаткового підтвердження',
      'На LTF без HTF контексту'
    ],
    confirmation: [
      'Дивергенція на ключовому рівні',
      'Корельовані інструменти',
      'MSS підтверджує',
      'POI узгоджений з divergence'
    ],
    examples: 'NAS100 робить новий low, SPX500 НЕ робить — bearish move може закінчуватись.'
  },
  {
    id: 'breaker_block',
    name: 'Breaker Block',
    type: 'Reversal',
    description: 'Order Block, який був пробитий і тепер працює у протилежний бік. Сильний reversal сетап з чіткими правилами входу. Часто формується після фейкового MSS.',
    rules: [
      'Має бути попередній OB',
      'Цей OB пробитий тілом',
      'Після пробиття — slom структури в інший бік',
      'Ціна повертається в зону пробитого OB',
      'Вхід — від 50% (MT) пробитого блоку'
    ],
    dontTrade: [
      'Пробиття було тільки тінню',
      'Немає підтвердження MSS',
      'BB проти HTF narrative',
      'Без FVG в напрямку нового руху'
    ],
    confirmation: [
      'Original OB пробитий тілом',
      'MSS у новому напрямку',
      'FVG після MSS',
      'Ретест від 50% BB',
      'Killzone'
    ],
    examples: 'XAUUSD був у uptrend, bullish OB на 2050. Пробитий тілом → bearish MSS. Повернення до 2050 → шорт.'
  },
  {
    id: 'inducement',
    name: 'Inducement',
    type: 'Reversal',
    description: 'Inducement — це штучно створена ліквідність, яка манить ритейл-трейдерів. Зазвичай це маленький pullback перед основним POI. Smart money використовує цю ліквідність для збору перед справжнім рухом.',
    rules: [
      'Визначаєш HTF POI (наприклад, 4H OB)',
      'Між поточною ціною і POI є мінорний swing — inducement',
      'Ціна заходить за inducement (sweep)',
      'Тільки потім досягає головного POI',
      'Вхід ПІСЛЯ зняття inducement + reaction від HTF POI'
    ],
    dontTrade: [
      'Inducement зняти, але POI пробитий — не входь',
      'Якщо inducement не явний — пропусти',
      'Без HTF narrative — не торгуєш'
    ],
    confirmation: [
      'HTF POI визначений',
      'Inducement (минорний swing) видно',
      'Sweep inducement стався',
      'Reaction від HTF POI',
      'MSS на LTF'
    ],
    examples: 'EURUSD: bullish OB на 1.0800 (HTF POI). Між поточним і POI є мінорний low 1.0825 (inducement). Ціна знімає 1.0825, потім іде в 1.0800, реакція — лонг.'
  }
];

// ============= UI HELPERS =============
const STATS_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

// ============= APP =============
export default function TradingWorkspace() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Persisted state
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [watchlistFx, setWatchlistFx] = useState(DEFAULT_WATCHLIST_FX);
  const [watchlistIdx, setWatchlistIdx] = useState(DEFAULT_WATCHLIST_IDX);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [trades, setTrades] = useState([]);
  const [checklistStates, setChecklistStates] = useState({});
  const [reviews, setReviews] = useState({ weekly: [], monthly: [] });
  const [mistakes, setMistakes] = useState([]);
  const [disciplineLog, setDisciplineLog] = useState([]);

  // Load data
  useEffect(() => {
    (async () => {
      const [s, wfx, widx, r, g, t, cs, rv, m, dl] = await Promise.all([
        storage.get('settings', DEFAULT_SETTINGS),
        storage.get('watchlist_fx', DEFAULT_WATCHLIST_FX),
        storage.get('watchlist_idx', DEFAULT_WATCHLIST_IDX),
        storage.get('rules', DEFAULT_RULES),
        storage.get('goals', DEFAULT_GOALS),
        storage.get('trades', []),
        storage.get('checklist_states', {}),
        storage.get('reviews', { weekly: [], monthly: [] }),
        storage.get('mistakes', []),
        storage.get('discipline_log', [])
      ]);
      setSettings(s); setWatchlistFx(wfx); setWatchlistIdx(widx);
      setRules(r); setGoals(g); setTrades(t); setChecklistStates(cs);
      setReviews(rv); setMistakes(m); setDisciplineLog(dl);
      setLoading(false);
    })();
  }, []);

  // Auto-save
  useEffect(() => { if (!loading) storage.set('settings', settings); }, [settings, loading]);
  useEffect(() => { if (!loading) storage.set('watchlist_fx', watchlistFx); }, [watchlistFx, loading]);
  useEffect(() => { if (!loading) storage.set('watchlist_idx', watchlistIdx); }, [watchlistIdx, loading]);
  useEffect(() => { if (!loading) storage.set('rules', rules); }, [rules, loading]);
  useEffect(() => { if (!loading) storage.set('goals', goals); }, [goals, loading]);
  useEffect(() => { if (!loading) storage.set('trades', trades); }, [trades, loading]);
  useEffect(() => { if (!loading) storage.set('checklist_states', checklistStates); }, [checklistStates, loading]);
  useEffect(() => { if (!loading) storage.set('reviews', reviews); }, [reviews, loading]);
  useEffect(() => { if (!loading) storage.set('mistakes', mistakes); }, [mistakes, loading]);
  useEffect(() => { if (!loading) storage.set('discipline_log', disciplineLog); }, [disciplineLog, loading]);

  // ============= COMPUTED STATS =============
  const stats = useMemo(() => {
    const closed = trades.filter(t => t.result && t.result !== 'open');
    const wins = closed.filter(t => t.result === 'win');
    const losses = closed.filter(t => t.result === 'loss');
    const be = closed.filter(t => t.result === 'be');

    const totalPnl = closed.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
    const grossWin = wins.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0));
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0);
    const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
    const avgRR = closed.length > 0 ? closed.reduce((s, t) => s + (parseFloat(t.rr) || 0), 0) / closed.length : 0;
    const avgR = closed.length > 0 ? closed.reduce((s, t) => {
      const r = parseFloat(t.rr) || 0;
      const mult = t.result === 'win' ? r : (t.result === 'loss' ? -1 : 0);
      return s + mult;
    }, 0) / closed.length : 0;

    // Equity curve
    let cumulative = settings.accountSize;
    const equityCurve = [{ idx: 0, equity: cumulative, date: 'Start' }];
    closed.forEach((t, i) => {
      cumulative += parseFloat(t.pnl) || 0;
      equityCurve.push({ idx: i + 1, equity: cumulative, date: t.date });
    });

    // By setup
    const bySetup = {};
    closed.forEach(t => {
      const s = t.setup || 'Other';
      if (!bySetup[s]) bySetup[s] = { name: s, wins: 0, total: 0, pnl: 0 };
      bySetup[s].total++;
      if (t.result === 'win') bySetup[s].wins++;
      bySetup[s].pnl += parseFloat(t.pnl) || 0;
    });
    const setupStats = Object.values(bySetup).map(s => ({
      ...s,
      winRate: s.total > 0 ? (s.wins / s.total) * 100 : 0
    }));

    // By pair
    const byPair = {};
    closed.forEach(t => {
      const p = t.pair || 'Other';
      if (!byPair[p]) byPair[p] = { name: p, pnl: 0, count: 0 };
      byPair[p].pnl += parseFloat(t.pnl) || 0;
      byPair[p].count++;
    });
    const pairStats = Object.values(byPair).sort((a, b) => b.pnl - a.pnl);

    // By session
    const bySession = {};
    closed.forEach(t => {
      const s = t.session || 'Other';
      if (!bySession[s]) bySession[s] = { name: s, pnl: 0, count: 0, wins: 0 };
      bySession[s].pnl += parseFloat(t.pnl) || 0;
      bySession[s].count++;
      if (t.result === 'win') bySession[s].wins++;
    });
    const sessionStats = Object.values(bySession);

    return {
      total: closed.length, wins: wins.length, losses: losses.length, be: be.length,
      totalPnl, grossWin, grossLoss, profitFactor, winRate, avgRR, avgR,
      equityCurve, setupStats, pairStats, sessionStats
    };
  }, [trades, settings]);

  // Today's P&L
  const todayPnl = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return trades.filter(t => t.date === today && t.result && t.result !== 'open')
      .reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
  }, [trades]);

  const todayRiskUsed = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return trades.filter(t => t.date === today && t.result === 'loss')
      .reduce((s, t) => s + Math.abs(parseFloat(t.pnl) || 0), 0);
  }, [trades]);

  const dailyLimit = settings.accountSize * (settings.maxDailyRiskPct / 100);
  const dailyRiskPct = (todayRiskUsed / dailyLimit) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">
        <div className="text-sm tracking-widest">LOADING WORKSPACE...</div>
      </div>
    );
  }

  // ============= TABS CONFIG =============
  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'checklists', label: 'Checklists', icon: CheckSquare },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'playbook', label: 'Playbook', icon: BookMarked },
    { id: 'risk', label: 'Risk', icon: Shield },
    { id: 'plan', label: 'Plan', icon: Calendar },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
    { id: 'psychology', label: 'Psychology', icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: '"JetBrains Mono", "SF Mono", monospace' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
        .display-font { font-family: 'Instrument Serif', serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .grid-bg {
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        input, textarea, select {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          color: #f4f4f5;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border-radius: 2px;
          outline: none;
          font-family: 'JetBrains Mono', monospace;
          transition: all 0.15s;
          width: 100%;
        }
        input:focus, textarea:focus, select:focus {
          border-color: rgba(16,185,129,0.5);
          background: rgba(255,255,255,0.05);
        }
        select option { background: #18181b; color: #f4f4f5; }
        .btn { padding: 0.5rem 1rem; font-size: 0.75rem; letter-spacing: 0.1em; font-weight: 500; text-transform: uppercase; transition: all 0.15s; cursor: pointer; border: 1px solid transparent; border-radius: 2px; display: inline-flex; align-items: center; gap: 0.5rem; }
        .btn-primary { background: #10b981; color: #052e1c; }
        .btn-primary:hover { background: #34d399; }
        .btn-ghost { background: transparent; border-color: rgba(255,255,255,0.1); color: #d4d4d8; }
        .btn-ghost:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2); }
        .btn-danger { background: transparent; border-color: rgba(239,68,68,0.3); color: #fca5a5; }
        .btn-danger:hover { background: rgba(239,68,68,0.1); }
        .scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar::-webkit-scrollbar-track { background: transparent; }
        .scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        .scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        @keyframes pulse-soft { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .pulse-dot { animation: pulse-soft 2s infinite; }
      `}</style>

      {/* HEADER */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center rounded-sm">
                <span className="text-emerald-400 text-xs font-bold tracking-tighter">SM</span>
              </div>
              <div>
                <div className="text-xs text-zinc-500 tracking-widest uppercase">Smart Money</div>
                <div className="display-font text-lg leading-none italic text-zinc-100">Workspace</div>
              </div>
            </div>
            <nav className="flex items-center gap-1">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-2 text-xs tracking-widest uppercase transition-all rounded-sm flex items-center gap-2 ${active ? 'text-emerald-400 bg-emerald-500/5' : 'text-zinc-500 hover:text-zinc-200'}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] text-zinc-500 tracking-widest uppercase">Account</div>
              <div className="text-sm text-zinc-100">{settings.currency}{(settings.accountSize + stats.totalPnl).toLocaleString()}</div>
            </div>
            <div className={`text-right border-l border-zinc-800 pl-4 ${todayPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <div className="text-[10px] text-zinc-500 tracking-widest uppercase">Today</div>
              <div className="text-sm">{todayPnl >= 0 ? '+' : ''}{settings.currency}{todayPnl.toFixed(2)}</div>
            </div>
            <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
              <div className="w-2 h-2 bg-emerald-500 rounded-full pulse-dot"></div>
              <span className="text-[10px] text-zinc-500 tracking-widest uppercase">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="px-6 py-6 grid-bg min-h-[calc(100vh-65px)]">
        {activeTab === 'dashboard' && <Dashboard {...{ settings, setSettings, watchlistFx, setWatchlistFx, watchlistIdx, setWatchlistIdx, rules, setRules, goals, setGoals, stats, todayPnl, todayRiskUsed, dailyLimit, dailyRiskPct }} />}
        {activeTab === 'checklists' && <Checklists {...{ checklistStates, setChecklistStates }} />}
        {activeTab === 'journal' && <Journal {...{ trades, setTrades, settings, watchlistFx, watchlistIdx }} />}
        {activeTab === 'playbook' && <Playbook />}
        {activeTab === 'risk' && <RiskManagement {...{ settings, setSettings, stats, todayRiskUsed, dailyLimit }} />}
        {activeTab === 'plan' && <Plan {...{ reviews, setReviews }} />}
        {activeTab === 'stats' && <Statistics {...{ stats, settings }} />}
        {activeTab === 'psychology' && <Psychology {...{ mistakes, setMistakes, disciplineLog, setDisciplineLog }} />}
      </main>
    </div>
  );
}

// ============= DASHBOARD =============
function Dashboard({ settings, setSettings, watchlistFx, setWatchlistFx, watchlistIdx, setWatchlistIdx, rules, setRules, goals, setGoals, stats, todayPnl, todayRiskUsed, dailyLimit, dailyRiskPct }) {
  const [newRule, setNewRule] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newFx, setNewFx] = useState('');
  const [newIdx, setNewIdx] = useState('');

  const session = useMemo(() => {
    const h = new Date().getUTCHours() + 3;
    const hour = ((h % 24) + 24) % 24;
    if (hour >= 3 && hour < 7) return { name: 'Asia KZ', color: 'amber' };
    if (hour >= 9 && hour < 12) return { name: 'London KZ', color: 'emerald' };
    if (hour >= 14 && hour < 17) return { name: 'New York KZ', color: 'emerald' };
    if (hour >= 16 && hour < 19) return { name: 'NY AM', color: 'sky' };
    if (hour >= 20 && hour < 23) return { name: 'NY PM', color: 'sky' };
    return { name: 'Off-Session', color: 'zinc' };
  }, []);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* TOP STRIP */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Account Balance" value={`${settings.currency}${(settings.accountSize + stats.totalPnl).toLocaleString()}`} sub={`Start: ${settings.currency}${settings.accountSize.toLocaleString()}`} />
        <StatCard label="Today P&L" value={`${todayPnl >= 0 ? '+' : ''}${settings.currency}${todayPnl.toFixed(2)}`} accent={todayPnl >= 0 ? 'green' : 'red'} sub="Live session" />
        <StatCard label="Daily Risk Used" value={`${dailyRiskPct.toFixed(1)}%`} sub={`Limit: ${settings.currency}${dailyLimit.toFixed(0)}`} accent={dailyRiskPct > 80 ? 'red' : dailyRiskPct > 50 ? 'amber' : 'green'} />
        <StatCard label="Active Session" value={session.name} sub={`UTC+3 ${new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`} accent={session.color === 'emerald' ? 'green' : session.color === 'amber' ? 'amber' : 'zinc'} />
      </div>

      {/* MARKET CONDITION + RISK BAR */}
      <Panel title="Risk Status" icon={Shield}>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-zinc-500 mb-2">
              <span className="tracking-widest uppercase">Daily Risk Allocation</span>
              <span>{settings.currency}{todayRiskUsed.toFixed(0)} / {settings.currency}{dailyLimit.toFixed(0)}</span>
            </div>
            <div className="h-2 bg-zinc-900 rounded-sm overflow-hidden">
              <div className={`h-full transition-all ${dailyRiskPct > 80 ? 'bg-red-500' : dailyRiskPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, dailyRiskPct)}%` }}></div>
            </div>
            {dailyRiskPct >= 100 && (
              <div className="mt-2 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                Daily limit reached — STOP TRADING
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* WATCHLISTS */}
      <div className="grid grid-cols-2 gap-4">
        <Panel title="Forex Watchlist" icon={Activity} action={
          <div className="flex gap-2">
            <input className="!w-32 !py-1 !text-xs" placeholder="ADD..." value={newFx} onChange={e => setNewFx(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter' && newFx.trim()) { setWatchlistFx([...watchlistFx, newFx.trim()]); setNewFx(''); }}} />
          </div>
        }>
          <div className="grid grid-cols-2 gap-2">
            {watchlistFx.map((p, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border border-white/5 rounded-sm hover:bg-white/[0.04] group">
                <span className="text-sm tracking-wider">{p}</span>
                <button onClick={() => setWatchlistFx(watchlistFx.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {watchlistFx.length === 0 && <div className="col-span-2 text-xs text-zinc-600 text-center py-4">No pairs in watchlist</div>}
          </div>
        </Panel>

        <Panel title="Indices Watchlist" icon={Activity} action={
          <input className="!w-32 !py-1 !text-xs" placeholder="ADD..." value={newIdx} onChange={e => setNewIdx(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter' && newIdx.trim()) { setWatchlistIdx([...watchlistIdx, newIdx.trim()]); setNewIdx(''); }}} />
        }>
          <div className="grid grid-cols-2 gap-2">
            {watchlistIdx.map((p, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border border-white/5 rounded-sm hover:bg-white/[0.04] group">
                <span className="text-sm tracking-wider">{p}</span>
                <button onClick={() => setWatchlistIdx(watchlistIdx.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {watchlistIdx.length === 0 && <div className="col-span-2 text-xs text-zinc-600 text-center py-4">No indices in watchlist</div>}
          </div>
        </Panel>
      </div>

      {/* RULES + GOALS */}
      <div className="grid grid-cols-2 gap-4">
        <Panel title="My Trading Rules" icon={CheckSquare} action={
          <input className="!w-40 !py-1 !text-xs" placeholder="NEW RULE..." value={newRule} onChange={e => setNewRule(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newRule.trim()) { setRules([...rules, newRule.trim()]); setNewRule(''); }}} />
        }>
          <div className="space-y-1.5">
            {rules.map((r, i) => (
              <div key={i} className="flex items-start justify-between gap-2 px-3 py-2 bg-white/[0.02] border-l-2 border-emerald-500/30 rounded-sm group">
                <div className="flex gap-3 items-start text-sm text-zinc-300">
                  <span className="text-emerald-500/50 text-xs mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  <span>{r}</span>
                </div>
                <button onClick={() => setRules(rules.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="My Goals" icon={Target} action={
          <input className="!w-40 !py-1 !text-xs" placeholder="NEW GOAL..." value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newGoal.trim()) { setGoals([...goals, { id: Date.now(), text: newGoal.trim(), done: false }]); setNewGoal(''); }}} />
        }>
          <div className="space-y-1.5">
            {goals.map((g) => (
              <div key={g.id} className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border border-white/5 rounded-sm group">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input type="checkbox" checked={g.done} onChange={() => setGoals(goals.map(x => x.id === g.id ? { ...x, done: !x.done } : x))} className="!w-auto accent-emerald-500" />
                  <span className={`text-sm ${g.done ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>{g.text}</span>
                </label>
                <button onClick={() => setGoals(goals.filter(x => x.id !== g.id))} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* QUICK SETTINGS */}
      <Panel title="Account Settings" icon={Settings}>
        <div className="grid grid-cols-5 gap-4">
          <Field label="Account Size">
            <input type="number" value={settings.accountSize} onChange={e => setSettings({ ...settings, accountSize: parseFloat(e.target.value) || 0 })} />
          </Field>
          <Field label="Currency">
            <select value={settings.currency} onChange={e => setSettings({ ...settings, currency: e.target.value })}>
              <option value="$">USD ($)</option>
              <option value="€">EUR (€)</option>
              <option value="₴">UAH (₴)</option>
              <option value="£">GBP (£)</option>
            </select>
          </Field>
          <Field label="Risk per Trade %">
            <input type="number" step="0.1" value={settings.riskPerTradePct} onChange={e => setSettings({ ...settings, riskPerTradePct: parseFloat(e.target.value) || 0 })} />
          </Field>
          <Field label="Max Daily Risk %">
            <input type="number" step="0.1" value={settings.maxDailyRiskPct} onChange={e => setSettings({ ...settings, maxDailyRiskPct: parseFloat(e.target.value) || 0 })} />
          </Field>
          <Field label="Max Weekly %">
            <input type="number" step="0.1" value={settings.weeklyRiskPct} onChange={e => setSettings({ ...settings, weeklyRiskPct: parseFloat(e.target.value) || 0 })} />
          </Field>
        </div>
      </Panel>
    </div>
  );
}

// ============= CHECKLISTS =============
function Checklists({ checklistStates, setChecklistStates }) {
  const [activeChecklist, setActiveChecklist] = useState('daily_bias');
  const cl = CHECKLISTS[activeChecklist];
  const state = checklistStates[activeChecklist] || {};
  const completed = Object.values(state).filter(Boolean).length;
  const total = cl.items.length;
  const pct = (completed / total) * 100;

  const toggle = (i) => {
    setChecklistStates({
      ...checklistStates,
      [activeChecklist]: { ...state, [i]: !state[i] }
    });
  };

  const reset = () => {
    setChecklistStates({ ...checklistStates, [activeChecklist]: {} });
  };

  return (
    <div className="max-w-[1600px] mx-auto grid grid-cols-[300px_1fr] gap-6">
      {/* SIDEBAR */}
      <div className="space-y-1">
        <div className="text-[10px] tracking-widest uppercase text-zinc-500 px-3 py-2">All Checklists</div>
        {Object.entries(CHECKLISTS).map(([key, c]) => {
          const s = checklistStates[key] || {};
          const done = Object.values(s).filter(Boolean).length;
          const active = activeChecklist === key;
          return (
            <button key={key} onClick={() => setActiveChecklist(key)} className={`w-full text-left px-3 py-3 transition-all border-l-2 ${active ? 'bg-emerald-500/5 border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200'}`}>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-base">{c.icon}</span>
                <span className="text-sm font-medium tracking-wide">{c.title}</span>
              </div>
              <div className="flex items-center gap-2 pl-9">
                <div className="flex-1 h-0.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${(done/c.items.length)*100}%` }}></div>
                </div>
                <span className="text-[10px] text-zinc-600">{done}/{c.items.length}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* CONTENT */}
      <div>
        <Panel title={`${cl.icon} ${cl.title}`} icon={CheckSquare} action={
          <button onClick={reset} className="btn btn-ghost text-[10px]">RESET</button>
        }>
          <div className="mb-6">
            <p className="text-sm text-zinc-400 mb-4">{cl.description}</p>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }}></div>
              </div>
              <span className="text-xs text-zinc-500">{completed} / {total} ({pct.toFixed(0)}%)</span>
            </div>
          </div>

          <div className="space-y-2">
            {cl.items.map((item, i) => (
              <button key={i} onClick={() => toggle(i)} className={`w-full text-left flex items-start gap-3 px-4 py-3 border transition-all rounded-sm ${state[i] ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                <div className={`mt-0.5 w-4 h-4 border rounded-sm flex items-center justify-center flex-shrink-0 ${state[i] ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-700'}`}>
                  {state[i] && <span className="text-zinc-950 text-[10px] font-bold">✓</span>}
                </div>
                <span className={`text-sm ${state[i] ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{item}</span>
              </button>
            ))}
          </div>

          {pct === 100 && (
            <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-sm">
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckSquare className="w-4 h-4" />
                <span className="font-medium">Checklist complete — you may proceed.</span>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ============= JOURNAL =============
function Journal({ trades, setTrades, settings, watchlistFx, watchlistIdx }) {
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');

  const blank = () => ({
    id: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    pair: '', direction: 'long', setup: '',
    session: 'London', entry: '', sl: '', tp: '',
    rr: '', result: 'open', pnl: '',
    emotion: '', mistakes: '', lesson: '',
    screenshotBefore: '', screenshotAfter: ''
  });

  const saveTrade = (trade) => {
    if (trades.find(t => t.id === trade.id)) {
      setTrades(trades.map(t => t.id === trade.id ? trade : t));
    } else {
      setTrades([trade, ...trades]);
    }
    setEditing(null);
  };

  const deleteTrade = (id) => {
    if (confirm('Видалити угоду?')) setTrades(trades.filter(t => t.id !== id));
  };

  const filtered = filter === 'all' ? trades : trades.filter(t => t.result === filter);

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="display-font text-3xl italic text-zinc-100">Trading Journal</h2>
          <p className="text-xs text-zinc-500 mt-1 tracking-widest uppercase">{trades.length} total trades recorded</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="!w-32" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">ALL TRADES</option>
            <option value="win">WINS</option>
            <option value="loss">LOSSES</option>
            <option value="be">BREAK EVEN</option>
            <option value="open">OPEN</option>
          </select>
          <button onClick={() => setEditing(blank())} className="btn btn-primary">
            <Plus className="w-3.5 h-3.5" /> New Trade
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="border border-white/5 rounded-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.03] text-[10px] tracking-widest uppercase text-zinc-500 border-b border-white/5">
                <th className="text-left px-3 py-2.5 font-medium">Date</th>
                <th className="text-left px-3 py-2.5 font-medium">Pair</th>
                <th className="text-left px-3 py-2.5 font-medium">Dir</th>
                <th className="text-left px-3 py-2.5 font-medium">Setup</th>
                <th className="text-left px-3 py-2.5 font-medium">Session</th>
                <th className="text-right px-3 py-2.5 font-medium">Entry</th>
                <th className="text-right px-3 py-2.5 font-medium">SL</th>
                <th className="text-right px-3 py-2.5 font-medium">TP</th>
                <th className="text-right px-3 py-2.5 font-medium">R:R</th>
                <th className="text-center px-3 py-2.5 font-medium">Result</th>
                <th className="text-right px-3 py-2.5 font-medium">P&L</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-12 text-zinc-600 text-sm">No trades yet. Click "New Trade" to start.</td></tr>
              ) : filtered.map((t, i) => (
                <tr key={t.id} className={`border-b border-white/5 hover:bg-white/[0.02] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                  <td className="px-3 py-2.5 text-zinc-400">{t.date}</td>
                  <td className="px-3 py-2.5 text-zinc-100 font-medium">{t.pair}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] tracking-widest uppercase px-1.5 py-0.5 rounded-sm ${t.direction === 'long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{t.direction}</span>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-400 text-xs">{t.setup}</td>
                  <td className="px-3 py-2.5 text-zinc-400 text-xs">{t.session}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-300">{t.entry}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-500">{t.sl}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-500">{t.tp}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-300">{t.rr ? `1:${t.rr}` : '—'}</td>
                  <td className="px-3 py-2.5 text-center">
                    <ResultBadge result={t.result} />
                  </td>
                  <td className={`px-3 py-2.5 text-right font-medium ${parseFloat(t.pnl) > 0 ? 'text-emerald-400' : parseFloat(t.pnl) < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                    {t.pnl ? `${parseFloat(t.pnl) >= 0 ? '+' : ''}${settings.currency}${parseFloat(t.pnl).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditing(t)} className="p-1 text-zinc-500 hover:text-emerald-400"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteTrade(t.id)} className="p-1 text-zinc-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editing && (
        <TradeEditor trade={editing} onSave={saveTrade} onCancel={() => setEditing(null)} watchlistFx={watchlistFx} watchlistIdx={watchlistIdx} settings={settings} />
      )}
    </div>
  );
}

function ResultBadge({ result }) {
  const map = {
    win: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'WIN' },
    loss: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'LOSS' },
    be: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', label: 'BE' },
    open: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'OPEN' }
  };
  const r = map[result] || map.open;
  return <span className={`text-[10px] tracking-widest uppercase px-1.5 py-0.5 rounded-sm ${r.bg} ${r.text}`}>{r.label}</span>;
}

function TradeEditor({ trade, onSave, onCancel, watchlistFx, watchlistIdx, settings }) {
  const [t, setT] = useState(trade);
  const allPairs = [...watchlistFx, ...watchlistIdx];

  // Auto R:R calc
  useEffect(() => {
    if (t.entry && t.sl && t.tp) {
      const e = parseFloat(t.entry), s = parseFloat(t.sl), tp = parseFloat(t.tp);
      const risk = Math.abs(e - s);
      const reward = Math.abs(tp - e);
      if (risk > 0) setT(prev => ({ ...prev, rr: (reward / risk).toFixed(2) }));
    }
  }, [t.entry, t.sl, t.tp]);

  // Auto P&L based on result
  const calcPnL = () => {
    const riskUSD = settings.accountSize * (settings.riskPerTradePct / 100);
    if (t.result === 'win') setT({ ...t, pnl: (riskUSD * parseFloat(t.rr || 0)).toFixed(2) });
    else if (t.result === 'loss') setT({ ...t, pnl: (-riskUSD).toFixed(2) });
    else if (t.result === 'be') setT({ ...t, pnl: '0' });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 overflow-y-auto">
      <div className="bg-zinc-950 border border-white/10 rounded-sm w-full max-w-4xl my-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="display-font italic text-xl">{trade.pair ? `Edit: ${trade.pair}` : 'New Trade'}</h3>
          <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar">
          {/* ROW 1 */}
          <div className="grid grid-cols-4 gap-3">
            <Field label="Date">
              <input type="date" value={t.date} onChange={e => setT({ ...t, date: e.target.value })} />
            </Field>
            <Field label="Pair">
              <input list="pairs" value={t.pair} onChange={e => setT({ ...t, pair: e.target.value.toUpperCase() })} placeholder="EURUSD" />
              <datalist id="pairs">{allPairs.map(p => <option key={p} value={p} />)}</datalist>
            </Field>
            <Field label="Direction">
              <select value={t.direction} onChange={e => setT({ ...t, direction: e.target.value })}>
                <option value="long">LONG</option>
                <option value="short">SHORT</option>
              </select>
            </Field>
            <Field label="Session">
              <select value={t.session} onChange={e => setT({ ...t, session: e.target.value })}>
                <option>Asia</option><option>London</option><option>NY AM</option><option>NY PM</option>
              </select>
            </Field>
          </div>
          {/* ROW 2 */}
          <div className="grid grid-cols-4 gap-3">
            <Field label="Setup">
              <select value={t.setup} onChange={e => setT({ ...t, setup: e.target.value })}>
                <option value="">— select —</option>
                {PLAYBOOK.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Entry">
              <input type="number" step="0.0001" value={t.entry} onChange={e => setT({ ...t, entry: e.target.value })} />
            </Field>
            <Field label="Stop Loss">
              <input type="number" step="0.0001" value={t.sl} onChange={e => setT({ ...t, sl: e.target.value })} />
            </Field>
            <Field label="Take Profit">
              <input type="number" step="0.0001" value={t.tp} onChange={e => setT({ ...t, tp: e.target.value })} />
            </Field>
          </div>
          {/* ROW 3 */}
          <div className="grid grid-cols-4 gap-3">
            <Field label="R:R (auto)">
              <input value={t.rr ? `1 : ${t.rr}` : ''} readOnly className="!bg-zinc-900/50 text-emerald-400" />
            </Field>
            <Field label="Result">
              <select value={t.result} onChange={e => setT({ ...t, result: e.target.value })}>
                <option value="open">OPEN</option>
                <option value="win">WIN</option>
                <option value="loss">LOSS</option>
                <option value="be">BE</option>
              </select>
            </Field>
            <Field label={`P&L (${settings.currency})`}>
              <input type="number" step="0.01" value={t.pnl} onChange={e => setT({ ...t, pnl: e.target.value })} />
            </Field>
            <Field label="Auto-calc P&L">
              <button onClick={calcPnL} className="btn btn-ghost w-full justify-center">
                <Calculator className="w-3.5 h-3.5" /> Calculate
              </button>
            </Field>
          </div>
          {/* ROW 4 — Emotions */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Emotion / State">
              <select value={t.emotion} onChange={e => setT({ ...t, emotion: e.target.value })}>
                <option value="">— select —</option>
                <option>Calm / Focused</option>
                <option>Confident</option>
                <option>FOMO</option>
                <option>Fearful / Hesitant</option>
                <option>Revenge</option>
                <option>Greedy</option>
                <option>Overconfident</option>
                <option>Tired</option>
              </select>
            </Field>
            <Field label="Mistakes (if any)">
              <input value={t.mistakes} onChange={e => setT({ ...t, mistakes: e.target.value })} placeholder="moved stop, no checklist..." />
            </Field>
          </div>
          {/* ROW 5 — Screenshots */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Screenshot Before (URL/link)">
              <input value={t.screenshotBefore} onChange={e => setT({ ...t, screenshotBefore: e.target.value })} placeholder="https://prnt.sc/..." />
            </Field>
            <Field label="Screenshot After (URL/link)">
              <input value={t.screenshotAfter} onChange={e => setT({ ...t, screenshotAfter: e.target.value })} placeholder="https://prnt.sc/..." />
            </Field>
          </div>
          {/* Lesson */}
          <Field label="Lesson Learned">
            <textarea rows="3" value={t.lesson} onChange={e => setT({ ...t, lesson: e.target.value })} placeholder="What did this trade teach you?"></textarea>
          </Field>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 bg-white/[0.02]">
          <button onClick={onCancel} className="btn btn-ghost">Cancel</button>
          <button onClick={() => onSave(t)} className="btn btn-primary">
            <Save className="w-3.5 h-3.5" /> Save Trade
          </button>
        </div>
      </div>
    </div>
  );
}

// ============= PLAYBOOK =============
function Playbook() {
  const [active, setActive] = useState(PLAYBOOK[0].id);
  const setup = PLAYBOOK.find(p => p.id === active);

  return (
    <div className="max-w-[1600px] mx-auto grid grid-cols-[280px_1fr] gap-6">
      <div className="space-y-1">
        <div className="text-[10px] tracking-widest uppercase text-zinc-500 px-3 py-2">My Setups</div>
        {PLAYBOOK.map(p => {
          const a = active === p.id;
          return (
            <button key={p.id} onClick={() => setActive(p.id)} className={`w-full text-left px-3 py-3 transition-all border-l-2 ${a ? 'bg-emerald-500/5 border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200'}`}>
              <div className="text-sm font-medium tracking-wide">{p.name}</div>
              <div className="text-[10px] text-zinc-600 tracking-widest uppercase mt-1">{p.type}</div>
            </button>
          );
        })}
      </div>

      <div>
        <div className="mb-6">
          <div className="text-[10px] tracking-widest uppercase text-zinc-500">{setup.type}</div>
          <h2 className="display-font text-3xl italic text-zinc-100 mt-1">{setup.name}</h2>
        </div>

        <Panel title="Description" icon={BookMarked}>
          <p className="text-sm text-zinc-300 leading-relaxed">{setup.description}</p>
        </Panel>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Panel title="Rules" icon={CheckSquare}>
            <div className="space-y-2">
              {setup.rules.map((r, i) => (
                <div key={i} className="flex gap-3 text-sm text-zinc-300">
                  <span className="text-emerald-500/50 text-xs mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Do NOT Trade When..." icon={AlertCircle}>
            <div className="space-y-2">
              {setup.dontTrade.map((r, i) => (
                <div key={i} className="flex gap-3 text-sm text-zinc-300">
                  <span className="text-red-500/50 text-xs mt-0.5">✕</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Panel title="Confirmation Checklist" icon={CheckSquare}>
            <div className="space-y-2">
              {setup.confirmation.map((r, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                  <div className="mt-0.5 w-4 h-4 border border-zinc-700 rounded-sm flex-shrink-0"></div>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Example" icon={BookOpen}>
            <p className="text-sm text-zinc-400 italic leading-relaxed">{setup.examples}</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ============= RISK MANAGEMENT =============
function RiskManagement({ settings, setSettings, stats, todayRiskUsed, dailyLimit }) {
  const [calc, setCalc] = useState({ entry: '', sl: '', riskPct: settings.riskPerTradePct });

  const positionSize = useMemo(() => {
    const e = parseFloat(calc.entry), s = parseFloat(calc.sl);
    const rp = parseFloat(calc.riskPct) || 0;
    if (!e || !s || e === s) return null;
    const riskUSD = settings.accountSize * (rp / 100);
    const slPips = Math.abs(e - s);
    const lotSize = riskUSD / slPips;
    return { riskUSD, slPips: slPips.toFixed(5), lotSize: lotSize.toFixed(2) };
  }, [calc, settings]);

  const psychRules = [
    'Я НЕ торгую, якщо втомлений / не виспаний',
    'Я НЕ торгую при сильному стресі',
    'Я НЕ переставляю стоп далі від точки входу',
    'Я НЕ доливаюсь в збиток (no averaging down)',
    'Я НЕ беру угоду без чек-листа',
    'Я НЕ торгую за 30 хвилин до red folder news',
    'Після 2 SL поспіль — стоп на день',
    'Після прибуткового дня я не «ще одну»',
    'Якщо ринок не дав чіткий сетап — я закриваю термінал',
    'Емоції — це сигнал зупинитись, не діяти'
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      <h2 className="display-font text-3xl italic">Risk Management System</h2>

      {/* RISK STATUS GRID */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Max Daily Risk" value={`${settings.maxDailyRiskPct}%`} sub={`${settings.currency}${dailyLimit.toFixed(0)}`} />
        <StatCard label="Used Today" value={`${settings.currency}${todayRiskUsed.toFixed(0)}`} sub={`${((todayRiskUsed/dailyLimit)*100).toFixed(0)}% of limit`} accent={todayRiskUsed >= dailyLimit ? 'red' : 'green'} />
        <StatCard label="Max Drawdown" value={`${settings.maxDrawdownPct}%`} sub={`${settings.currency}${(settings.accountSize * settings.maxDrawdownPct / 100).toFixed(0)}`} />
        <StatCard label="Per Trade" value={`${settings.riskPerTradePct}%`} sub={`${settings.currency}${(settings.accountSize * settings.riskPerTradePct / 100).toFixed(0)}`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* POSITION SIZE CALC */}
        <Panel title="Position Size Calculator" icon={Calculator}>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Field label="Entry">
              <input type="number" step="0.0001" value={calc.entry} onChange={e => setCalc({ ...calc, entry: e.target.value })} placeholder="1.0850" />
            </Field>
            <Field label="Stop Loss">
              <input type="number" step="0.0001" value={calc.sl} onChange={e => setCalc({ ...calc, sl: e.target.value })} placeholder="1.0820" />
            </Field>
            <Field label="Risk %">
              <input type="number" step="0.1" value={calc.riskPct} onChange={e => setCalc({ ...calc, riskPct: e.target.value })} />
            </Field>
          </div>

          {positionSize ? (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-sm p-4 space-y-2">
              <Row label="Risk Amount" value={`${settings.currency}${positionSize.riskUSD.toFixed(2)}`} />
              <Row label="SL Distance" value={positionSize.slPips} />
              <Row label="Position Size" value={positionSize.lotSize} large />
              <div className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
                Position size розраховується як risk / SL distance. Для лотів додатково врахуй pip value (для FX 0.0001 = 1 pip = $10 на стандартному лоті).
              </div>
            </div>
          ) : (
            <div className="text-xs text-zinc-600 text-center py-8">Введи entry і SL для розрахунку</div>
          )}
        </Panel>

        {/* PSYCH RULES */}
        <Panel title="Psychological Rules" icon={Brain}>
          <div className="space-y-2">
            {psychRules.map((r, i) => (
              <div key={i} className="flex gap-3 px-3 py-2 bg-white/[0.02] border-l-2 border-red-500/30 rounded-sm">
                <span className="text-red-500/50 text-xs mt-0.5">!</span>
                <span className="text-sm text-zinc-300">{r}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* SETTINGS */}
      <Panel title="Risk Parameters" icon={Settings}>
        <div className="grid grid-cols-5 gap-4">
          <Field label="Account Size">
            <input type="number" value={settings.accountSize} onChange={e => setSettings({ ...settings, accountSize: parseFloat(e.target.value) || 0 })} />
          </Field>
          <Field label="Risk per Trade %">
            <input type="number" step="0.1" value={settings.riskPerTradePct} onChange={e => setSettings({ ...settings, riskPerTradePct: parseFloat(e.target.value) || 0 })} />
          </Field>
          <Field label="Max Daily %">
            <input type="number" step="0.1" value={settings.maxDailyRiskPct} onChange={e => setSettings({ ...settings, maxDailyRiskPct: parseFloat(e.target.value) || 0 })} />
          </Field>
          <Field label="Max Weekly %">
            <input type="number" step="0.1" value={settings.weeklyRiskPct} onChange={e => setSettings({ ...settings, weeklyRiskPct: parseFloat(e.target.value) || 0 })} />
          </Field>
          <Field label="Max Drawdown %">
            <input type="number" step="0.1" value={settings.maxDrawdownPct} onChange={e => setSettings({ ...settings, maxDrawdownPct: parseFloat(e.target.value) || 0 })} />
          </Field>
        </div>
      </Panel>
    </div>
  );
}

// ============= PLAN =============
function Plan({ reviews, setReviews }) {
  const [view, setView] = useState('routine');
  const [newWeekly, setNewWeekly] = useState({ date: '', what_worked: '', what_failed: '', focus_next: '' });
  const [newMonthly, setNewMonthly] = useState({ month: '', total_trades: '', winrate: '', pnl: '', biggest_win: '', biggest_lesson: '', next_month_goal: '' });

  const dailyRoutine = [
    { time: '07:00', task: 'Підйом, кава, без новин' },
    { time: '07:30', task: 'Перегляд календаря — red folder news сьогодні?' },
    { time: '08:00', task: 'Top-Down аналіз: 1W → 1D → 4H → 1H' },
    { time: '08:30', task: 'Запис гіпотез на день (А і Б)' },
    { time: '08:45', task: 'Чек-лист #1 — Підготовка до торгового дня' },
    { time: '09:00', task: '☀ LONDON KZ — спостереження за маніпуляцією' },
    { time: '10:00', task: '🎯 OTT #1 — найкращий час для входу' },
    { time: '12:00', task: 'Закриття LO — оцінка дня, перерва' },
    { time: '14:00', task: '☀ NY KZ — основна доставка ціни' },
    { time: '15:00', task: '🎯 OTT #2 — другий найкращий час' },
    { time: '17:00', task: 'Закриття NY KZ — пауза або трейлінг' },
    { time: '19:00', task: 'Чек-лист #4 — Розбірка дня' },
    { time: '19:30', task: 'Запис в журнал, заповнення статистики' },
    { time: '20:00', task: 'Завершення робочого дня. Без графіків.' }
  ];

  const sessionPrep = [
    'Перевірити календар новин (Forex Factory / Investing)',
    'Подивитись як закрилась попередня сесія',
    'Зробити Top-Down аналіз основних інструментів',
    'Визначити ключові рівні (POI, ліквідність)',
    'Сформулювати очікування від сесії',
    'Налаштувати алерти на ключові рівні',
    'Переконатись що ризик-параметри не порушені',
    'Чек-лист #1 пройдений на 100%'
  ];

  const weeklyTasks = [
    'Sunday: HTF аналіз (Weekly + Daily для всього watchlist)',
    'Sunday: Визначення тижневого narrative для кожної пари',
    'Sunday: Перегляд economic calendar на тиждень',
    'Friday: Закриття всіх позицій (НЕ залишаю на вихідні без причини)',
    'Friday: Аналіз тижня (P&L, win rate, що змінити)',
    'Saturday: Бектест 10 сетапів проти своїх правил',
    'Saturday: Чек-лист #4 (тижневий) — рев\'ю всіх угод'
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="display-font text-3xl italic">Trading Plan</h2>
        <div className="flex gap-2">
          {['routine', 'session', 'weekly', 'monthly', 'reviews'].map(v => (
            <button key={v} onClick={() => setView(v)} className={`btn ${view === v ? 'btn-primary' : 'btn-ghost'}`}>
              {v.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {view === 'routine' && (
        <Panel title="Daily Routine" icon={Calendar}>
          <div className="space-y-1">
            {dailyRoutine.map((r, i) => (
              <div key={i} className="grid grid-cols-[80px_1fr] gap-4 px-3 py-2.5 bg-white/[0.02] border-l-2 border-emerald-500/20 rounded-sm">
                <span className="text-emerald-400 mono text-sm">{r.time}</span>
                <span className="text-sm text-zinc-300">{r.task}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {view === 'session' && (
        <div className="grid grid-cols-2 gap-4">
          <Panel title="Session Preparation" icon={Calendar}>
            <div className="space-y-2">
              {sessionPrep.map((s, i) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2 bg-white/[0.02] rounded-sm">
                  <div className="mt-0.5 w-4 h-4 border border-zinc-700 rounded-sm flex-shrink-0"></div>
                  <span className="text-sm text-zinc-300">{s}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="News Preparation" icon={AlertCircle}>
            <div className="space-y-2">
              {[
                'Перевірити: чи є red folder news сьогодні?',
                'Якщо є — записати точний час',
                'За 30 хв до news — закрити позиції або зменшити',
                'НЕ входити в перші 15 хв після news (волатильність)',
                'Не «вгадувати» напрям руху на новинах',
                'NFP, FOMC, CPI — особлива обережність',
                'Reuters / Bloomberg для несподіваних новин',
                'Якщо вже в позиції — стоп вже виставлений'
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2 bg-white/[0.02] rounded-sm">
                  <div className="mt-0.5 w-4 h-4 border border-amber-500/30 rounded-sm flex-shrink-0"></div>
                  <span className="text-sm text-zinc-300">{s}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {view === 'weekly' && (
        <Panel title="Weekly Plan" icon={Calendar}>
          <div className="space-y-1">
            {weeklyTasks.map((t, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5 bg-white/[0.02] border-l-2 border-sky-500/30 rounded-sm">
                <span className="text-sky-400/50 text-xs mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-sm text-zinc-300">{t}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {view === 'monthly' && (
        <Panel title="Monthly Review Template" icon={Calendar}>
          <div className="text-sm text-zinc-400 mb-4">Шаблон для місячного звіту. Заповнюй останнього дня кожного місяця.</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Month"><input value={newMonthly.month} onChange={e => setNewMonthly({...newMonthly, month: e.target.value})} placeholder="May 2026"/></Field>
            <Field label="Total Trades"><input type="number" value={newMonthly.total_trades} onChange={e => setNewMonthly({...newMonthly, total_trades: e.target.value})}/></Field>
            <Field label="Win Rate %"><input type="number" value={newMonthly.winrate} onChange={e => setNewMonthly({...newMonthly, winrate: e.target.value})}/></Field>
            <Field label="Total P&L"><input value={newMonthly.pnl} onChange={e => setNewMonthly({...newMonthly, pnl: e.target.value})}/></Field>
            <Field label="Biggest Win Story"><textarea rows="2" value={newMonthly.biggest_win} onChange={e => setNewMonthly({...newMonthly, biggest_win: e.target.value})}/></Field>
            <Field label="Biggest Lesson"><textarea rows="2" value={newMonthly.biggest_lesson} onChange={e => setNewMonthly({...newMonthly, biggest_lesson: e.target.value})}/></Field>
            <Field label="Next Month Goal"><textarea rows="2" value={newMonthly.next_month_goal} onChange={e => setNewMonthly({...newMonthly, next_month_goal: e.target.value})}/></Field>
          </div>
          <button onClick={() => { setReviews({ ...reviews, monthly: [{ id: Date.now(), ...newMonthly }, ...reviews.monthly] }); setNewMonthly({ month: '', total_trades: '', winrate: '', pnl: '', biggest_win: '', biggest_lesson: '', next_month_goal: '' });}} className="btn btn-primary mt-4">
            <Save className="w-3.5 h-3.5" /> Save Monthly Review
          </button>
        </Panel>
      )}

      {view === 'reviews' && (
        <div className="space-y-4">
          <Panel title="Weekly Review (new)" icon={Calendar}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Week of"><input type="date" value={newWeekly.date} onChange={e => setNewWeekly({...newWeekly, date: e.target.value})}/></Field>
              <div></div>
              <Field label="What worked"><textarea rows="3" value={newWeekly.what_worked} onChange={e => setNewWeekly({...newWeekly, what_worked: e.target.value})}/></Field>
              <Field label="What failed"><textarea rows="3" value={newWeekly.what_failed} onChange={e => setNewWeekly({...newWeekly, what_failed: e.target.value})}/></Field>
              <Field label="Focus next week"><textarea rows="2" value={newWeekly.focus_next} onChange={e => setNewWeekly({...newWeekly, focus_next: e.target.value})}/></Field>
            </div>
            <button onClick={() => { setReviews({ ...reviews, weekly: [{ id: Date.now(), ...newWeekly }, ...reviews.weekly] }); setNewWeekly({ date: '', what_worked: '', what_failed: '', focus_next: '' });}} className="btn btn-primary mt-4">
              <Save className="w-3.5 h-3.5" /> Save Weekly Review
            </button>
          </Panel>

          <Panel title="Saved Weekly Reviews" icon={BookOpen}>
            {reviews.weekly.length === 0 ? <div className="text-xs text-zinc-600 text-center py-4">No reviews yet</div> :
              <div className="space-y-2">
                {reviews.weekly.map(r => (
                  <details key={r.id} className="bg-white/[0.02] border border-white/5 rounded-sm">
                    <summary className="px-3 py-2 cursor-pointer text-sm text-zinc-200 flex items-center justify-between">
                      <span>Week of {r.date}</span>
                      <ChevronRight className="w-4 h-4" />
                    </summary>
                    <div className="px-3 pb-3 space-y-2 text-sm">
                      <div><span className="text-emerald-400 text-xs tracking-widest uppercase">Worked:</span><div className="text-zinc-300">{r.what_worked}</div></div>
                      <div><span className="text-red-400 text-xs tracking-widest uppercase">Failed:</span><div className="text-zinc-300">{r.what_failed}</div></div>
                      <div><span className="text-amber-400 text-xs tracking-widest uppercase">Focus:</span><div className="text-zinc-300">{r.focus_next}</div></div>
                    </div>
                  </details>
                ))}
              </div>
            }
          </Panel>

          <Panel title="Saved Monthly Reviews" icon={BookOpen}>
            {reviews.monthly.length === 0 ? <div className="text-xs text-zinc-600 text-center py-4">No monthly reviews yet</div> :
              <div className="space-y-2">
                {reviews.monthly.map(r => (
                  <details key={r.id} className="bg-white/[0.02] border border-white/5 rounded-sm">
                    <summary className="px-3 py-2 cursor-pointer text-sm text-zinc-200">{r.month} — {r.total_trades} trades, WR {r.winrate}%, P&L {r.pnl}</summary>
                    <div className="px-3 pb-3 space-y-2 text-sm">
                      <div><span className="text-emerald-400 text-xs">Biggest Win:</span><div className="text-zinc-300">{r.biggest_win}</div></div>
                      <div><span className="text-amber-400 text-xs">Biggest Lesson:</span><div className="text-zinc-300">{r.biggest_lesson}</div></div>
                      <div><span className="text-sky-400 text-xs">Next Goal:</span><div className="text-zinc-300">{r.next_month_goal}</div></div>
                    </div>
                  </details>
                ))}
              </div>
            }
          </Panel>
        </div>
      )}
    </div>
  );
}

// ============= STATISTICS =============
function Statistics({ stats, settings }) {
  const sessionPie = stats.sessionStats.map(s => ({ name: s.name, value: Math.abs(s.pnl) }));
  const resultPie = [
    { name: 'Wins', value: stats.wins, color: '#10b981' },
    { name: 'Losses', value: stats.losses, color: '#ef4444' },
    { name: 'BE', value: stats.be, color: '#71717a' }
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      <h2 className="display-font text-3xl italic">Statistics & Analytics</h2>

      <div className="grid grid-cols-6 gap-3">
        <StatCard label="Total Trades" value={stats.total} />
        <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} accent={stats.winRate >= 50 ? 'green' : 'amber'} />
        <StatCard label="Profit Factor" value={isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'} accent={stats.profitFactor >= 1.5 ? 'green' : stats.profitFactor >= 1 ? 'amber' : 'red'} />
        <StatCard label="Avg R-Multiple" value={`${stats.avgR >= 0 ? '+' : ''}${stats.avgR.toFixed(2)}R`} accent={stats.avgR >= 0 ? 'green' : 'red'} />
        <StatCard label="Avg R:R" value={`1:${stats.avgRR.toFixed(2)}`} />
        <StatCard label="Total P&L" value={`${stats.totalPnl >= 0 ? '+' : ''}${settings.currency}${stats.totalPnl.toFixed(0)}`} accent={stats.totalPnl >= 0 ? 'green' : 'red'} />
      </div>

      {stats.total === 0 ? (
        <Panel title="No Data Yet" icon={BarChart3}>
          <div className="text-center py-12 text-zinc-600 text-sm">Заповни кілька угод в Journal, щоб побачити статистику.</div>
        </Panel>
      ) : (
        <>
          <Panel title="Equity Curve" icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats.equityCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="idx" stroke="#71717a" style={{ fontSize: 11 }} />
                <YAxis stroke="#71717a" style={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }} />
                <Line type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <div className="grid grid-cols-2 gap-4">
            <Panel title="Performance by Setup" icon={Target}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.setupStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#71717a" style={{ fontSize: 10 }} />
                  <YAxis stroke="#71717a" style={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }} />
                  <Bar dataKey="pnl" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Win/Loss Distribution" icon={Activity}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={resultPie} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} style={{ fontSize: 11 }}>
                    {resultPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Panel title="Profit by Pair" icon={DollarSign}>
              {stats.pairStats.length === 0 ? <div className="text-xs text-zinc-600 text-center py-4">No data</div> :
                <div className="space-y-2">
                  {stats.pairStats.map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-white/[0.02] rounded-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-500 text-xs">{String(i + 1).padStart(2, '0')}</span>
                        <span className="text-sm font-medium">{p.name}</span>
                        <span className="text-[10px] text-zinc-500 tracking-widest uppercase">{p.count} trades</span>
                      </div>
                      <span className={`text-sm font-medium ${p.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{p.pnl >= 0 ? '+' : ''}{settings.currency}{p.pnl.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              }
            </Panel>

            <Panel title="Performance by Session" icon={Activity}>
              {stats.sessionStats.length === 0 ? <div className="text-xs text-zinc-600 text-center py-4">No data</div> :
                <div className="space-y-2">
                  {stats.sessionStats.map((s, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-white/[0.02] rounded-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{s.name}</span>
                        <span className="text-[10px] text-zinc-500 tracking-widest uppercase">{s.count} trades · {((s.wins/s.count)*100).toFixed(0)}% WR</span>
                      </div>
                      <span className={`text-sm font-medium ${s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{s.pnl >= 0 ? '+' : ''}{settings.currency}{s.pnl.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              }
            </Panel>
          </div>

          <Panel title="Best & Worst Setup" icon={Target}>
            <div className="grid grid-cols-2 gap-4">
              {(() => {
                const sorted = [...stats.setupStats].sort((a, b) => b.pnl - a.pnl);
                const best = sorted[0];
                const worst = sorted[sorted.length - 1];
                return (
                  <>
                    {best && <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-sm">
                      <div className="text-[10px] tracking-widest uppercase text-emerald-400 mb-2">Best Setup</div>
                      <div className="display-font italic text-2xl text-zinc-100">{best.name}</div>
                      <div className="text-sm text-zinc-400 mt-2">{best.total} trades · WR {best.winRate.toFixed(0)}% · {settings.currency}{best.pnl.toFixed(0)}</div>
                    </div>}
                    {worst && worst !== best && <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-sm">
                      <div className="text-[10px] tracking-widest uppercase text-red-400 mb-2">Needs Work</div>
                      <div className="display-font italic text-2xl text-zinc-100">{worst.name}</div>
                      <div className="text-sm text-zinc-400 mt-2">{worst.total} trades · WR {worst.winRate.toFixed(0)}% · {settings.currency}{worst.pnl.toFixed(0)}</div>
                    </div>}
                  </>
                );
              })()}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

// ============= PSYCHOLOGY =============
function Psychology({ mistakes, setMistakes, disciplineLog, setDisciplineLog }) {
  const [newMistake, setNewMistake] = useState({ date: new Date().toISOString().slice(0,10), category: 'FOMO', description: '', cost: '', fix: '' });
  const [todayDiscipline, setTodayDiscipline] = useState({ followed_rules: false, no_revenge: false, no_overtrade: false, journal_done: false, took_breaks: false });

  const today = new Date().toISOString().slice(0, 10);
  const todayLog = disciplineLog.find(d => d.date === today);

  const saveDiscipline = () => {
    const entry = { date: today, ...todayDiscipline };
    setDisciplineLog([entry, ...disciplineLog.filter(d => d.date !== today)]);
  };

  const disciplineScore = (entry) => {
    const keys = ['followed_rules', 'no_revenge', 'no_overtrade', 'journal_done', 'took_breaks'];
    return keys.filter(k => entry[k]).length;
  };

  // Category stats
  const categoryStats = useMemo(() => {
    const map = {};
    mistakes.forEach(m => {
      if (!map[m.category]) map[m.category] = 0;
      map[m.category]++;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [mistakes]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      <h2 className="display-font text-3xl italic">Psychology & Discipline</h2>

      <div className="grid grid-cols-2 gap-4">
        {/* TODAY DISCIPLINE */}
        <Panel title="Today's Discipline" icon={Brain}>
          <div className="space-y-2">
            {[
              { key: 'followed_rules', label: 'Я слідував усім своїм правилам' },
              { key: 'no_revenge', label: 'Я не торгував з помсти / FOMO' },
              { key: 'no_overtrade', label: 'Я не перевищив ліміт угод' },
              { key: 'journal_done', label: 'Я записав ВСІ угоди в журнал' },
              { key: 'took_breaks', label: 'Я робив перерви між сесіями' }
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 px-3 py-2 bg-white/[0.02] rounded-sm cursor-pointer hover:bg-white/[0.04]">
                <input type="checkbox" checked={todayDiscipline[key]} onChange={e => setTodayDiscipline({ ...todayDiscipline, [key]: e.target.checked })} className="!w-auto accent-emerald-500" />
                <span className="text-sm text-zinc-300">{label}</span>
              </label>
            ))}
          </div>
          <button onClick={saveDiscipline} className="btn btn-primary mt-4">
            <Save className="w-3.5 h-3.5" /> Save Today
          </button>
          {todayLog && <div className="mt-3 text-xs text-emerald-400">✓ Saved for today ({disciplineScore(todayLog)}/5)</div>}
        </Panel>

        {/* DISCIPLINE HISTORY */}
        <Panel title="Discipline Trend (last 14 days)" icon={Activity}>
          {disciplineLog.length === 0 ? <div className="text-xs text-zinc-600 text-center py-4">No discipline data yet</div> :
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={disciplineLog.slice(0, 14).reverse().map(d => ({ ...d, score: disciplineScore(d) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: 10 }} />
                <YAxis domain={[0, 5]} stroke="#71717a" style={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }} />
                <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          }
        </Panel>
      </div>

      {/* MISTAKES TRACKER */}
      <Panel title="Mistakes Tracker" icon={AlertCircle}>
        <div className="grid grid-cols-5 gap-3 mb-4">
          <Field label="Date"><input type="date" value={newMistake.date} onChange={e => setNewMistake({...newMistake, date: e.target.value})}/></Field>
          <Field label="Category">
            <select value={newMistake.category} onChange={e => setNewMistake({...newMistake, category: e.target.value})}>
              <option>FOMO</option><option>Revenge Trade</option><option>Moved Stop</option><option>Overtraded</option>
              <option>No Checklist</option><option>Wrong Session</option><option>Against Narrative</option>
              <option>Oversized</option><option>News Trade</option><option>Other</option>
            </select>
          </Field>
          <Field label="Description"><input value={newMistake.description} onChange={e => setNewMistake({...newMistake, description: e.target.value})} placeholder="Що сталось..."/></Field>
          <Field label="Cost"><input value={newMistake.cost} onChange={e => setNewMistake({...newMistake, cost: e.target.value})} placeholder="$100"/></Field>
          <Field label="Fix / Lesson"><input value={newMistake.fix} onChange={e => setNewMistake({...newMistake, fix: e.target.value})} placeholder="Як уникнути"/></Field>
        </div>
        <button onClick={() => { setMistakes([{ id: Date.now(), ...newMistake }, ...mistakes]); setNewMistake({ date: new Date().toISOString().slice(0,10), category: 'FOMO', description: '', cost: '', fix: '' }); }} className="btn btn-primary mb-4">
          <Plus className="w-3.5 h-3.5" /> Log Mistake
        </button>

        {mistakes.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/[0.02] border border-white/5 rounded-sm p-4">
                <div className="text-[10px] tracking-widest uppercase text-zinc-500 mb-3">Top Mistake Categories</div>
                {categoryStats.sort((a,b) => b.value - a.value).slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-zinc-300">{c.name}</span>
                    <span className="text-sm text-red-400">{c.value}×</span>
                  </div>
                ))}
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-sm p-4">
                <div className="text-[10px] tracking-widest uppercase text-zinc-500 mb-3">Total Mistakes Logged</div>
                <div className="display-font text-5xl italic text-red-400">{mistakes.length}</div>
                <div className="text-xs text-zinc-500 mt-2">З того, що ти не відстежуєш — нічого не покращиться.</div>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar">
              {mistakes.map(m => (
                <div key={m.id} className="grid grid-cols-[100px_140px_1fr_80px_1fr_30px] gap-3 items-center px-3 py-2 bg-white/[0.02] border-l-2 border-red-500/30 rounded-sm group">
                  <span className="text-xs text-zinc-500">{m.date}</span>
                  <span className="text-xs tracking-widest uppercase text-red-400">{m.category}</span>
                  <span className="text-sm text-zinc-300">{m.description}</span>
                  <span className="text-sm text-red-400 font-medium">{m.cost}</span>
                  <span className="text-sm text-emerald-400 italic">→ {m.fix}</span>
                  <button onClick={() => setMistakes(mistakes.filter(x => x.id !== m.id))} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

// ============= REUSABLE COMPONENTS =============
function Panel({ title, icon: Icon, action, children }) {
  return (
    <div className="border border-white/5 bg-white/[0.01] rounded-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5 text-zinc-500" />}
          <span className="text-[11px] tracking-widest uppercase text-zinc-400 font-medium">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatCard({ label, value, sub, accent = 'default' }) {
  const colors = {
    default: 'text-zinc-100',
    green: 'text-emerald-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
    zinc: 'text-zinc-300'
  };
  return (
    <div className="border border-white/5 bg-white/[0.01] rounded-sm px-4 py-3.5">
      <div className="text-[10px] tracking-widest uppercase text-zinc-500 mb-1.5">{label}</div>
      <div className={`text-2xl font-medium ${colors[accent]}`}>{value}</div>
      {sub && <div className="text-[10px] text-zinc-600 mt-1">{sub}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[10px] tracking-widest uppercase text-zinc-500 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, large = false }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[10px] tracking-widest uppercase text-zinc-500">{label}</span>
      <span className={`text-emerald-400 ${large ? 'text-2xl font-medium' : 'text-sm'}`}>{value}</span>
    </div>
  );
}
