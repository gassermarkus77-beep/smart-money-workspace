'use strict';

(function () {
  const STORAGE_KEY = 'smart-money-workspace.vanilla.v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const money = (value, currency = '$') => `${currency}${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const pct = (value) => `${Number(value || 0).toFixed(1)}%`;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

  const DEFAULT_SETTINGS = {
    accountSize: 15000,
    currency: '$',
    riskPerTradePct: 0.5,
    maxDailyRiskPct: 2,
    maxDrawdownPct: 5,
    weeklyRiskPct: 5
  };

  const CHECKLISTS = {
    daily_bias: {
      title: 'Daily Bias', icon: '🎯', description: 'Визначення напрямку дня перед сесією',
      items: ['Подивився Weekly: в якій фазі ринок?', 'Подивився Daily: бичий / ведмежий / range?', 'Знайшов ключові пули: PMH/PML, PWH/PWL, PDH/PDL', 'Визначив рівень NYM (New York Midnight Open)', 'Сформулював гіпотезу А і Б', 'Записав bias одним реченням']
    },
    liquidity: {
      title: 'Liquidity', icon: '💧', description: 'Аналіз пулів ліквідності та куди йде ціна',
      items: ['Визначив BSL — стопи зверху', 'Визначив SSL — стопи знизу', 'External/Internal liquidity розділена', 'Найближча незнята ліквідність визначена', 'Зрозуміло куди ціна цілиться', 'Я НЕ входжу В пул — я входжу ПІСЛЯ raid']
    },
    bos_mss: {
      title: 'BOS / MSS', icon: '📐', description: 'Слом структури — підтвердження напрямку',
      items: ['Бачу чіткий swing high / swing low', 'Слом структури тілом, не тінню', 'Real MS узгоджений з HTF', 'Слом після захоплення ліквідності', '2+ ТФ синхронізовані', 'Після MSS утворився FVG']
    },
    ob_fvg: {
      title: 'OB / FVG', icon: '🟦', description: 'Order Block та Fair Value Gap',
      items: ['Order Block узгоджений з Order Flow', 'Поруч з OB є FVG', 'OB у Discount/Premium', 'Перед OB був raid ліквідності', 'Обрав агресивний або консервативний вхід', 'OB не пробитий тілом']
    },
    premium_discount: {
      title: 'Premium / Discount', icon: '⚖️', description: 'Ціна дорога чи дешева? PD Array',
      items: ['Намалював Dealing Range', 'Fib: 0; 0.5; 0.62; 0.705; 0.79; 1', 'Визначив Equilibrium 50%', 'Long тільки в Discount', 'Short тільки в Premium', 'OTE 0.62-0.79 як confluence']
    },
    session_timing: {
      title: 'Session Timing', icon: '⏰', description: 'Killzones та Optimal Trader Time',
      items: ['Я в killzone LO 09-12 / NY 14-17 UTC+3', 'Або в OTT 10:00-11:30 / 15:00-17:00', 'Не входжу перед закриттям сесії', 'Не входжу за 30 хв до red folder news', 'Є реакція ціни в сесії', 'Stop логічний, не на око']
    },
    news_filter: {
      title: 'News Filter', icon: '📰', description: 'Перевірка новинного фону',
      items: ['Перевірив Forex Factory / Investing', 'Немає red folder news у найближчі 60 хв', 'Знаю час NFP / FOMC / CPI', 'Якщо новини — позиція закрита або зменшена', 'Не торгую перші 15 хв після новин', 'Не вгадую напрям на новинах']
    },
    rr_confirmation: {
      title: 'R:R Confirmation', icon: '⚙️', description: 'Ризик/винагорода перед угодою',
      items: ['Position size розрахований', 'Stop за swing/POI', 'Target = наступний пул ліквідності', 'R:R ≥ 1:2 мінімум', 'R:R ≥ 1:3 для full size', 'Partial at +1R готовий']
    }
  };

  const PLAYBOOK = [
    { id: 'liquidity_sweep', name: 'Liquidity Sweep', type: 'Reversal', description: 'Ціна заходить за ключовий рівень ліквідності, захоплює стопи, потім швидко повертається. Після raid — MSS і вхід у зворотному напрямку.', confirmation: ['Чіткий пул ліквідності', 'Sweep + швидке повернення', 'MSS на LTF', 'FVG/OB на ретесті', 'Killzone активна'] },
    { id: 'london_manipulation', name: 'London Manipulation', type: 'Reversal/Continuation', description: 'London робить маніпуляцію вище/нижче Asia range, а NY підтверджує реальний напрям доставки ціни.', confirmation: ['Asia range визначений', 'London sweep Asia high/low', 'Return in range', 'NY MSS', 'HTF POI в напрямку'] },
    { id: 'ny_reversal', name: 'NY Reversal', type: 'Reversal', description: 'NY сесія часто реверсить сильний London рух, особливо біля HTF POI та NY open.', confirmation: ['Сильний LO move', 'Контакт з HTF POI', 'MSS на NY open', 'FVG у зворотному напрямку'] },
    { id: 'ob_continuation', name: 'OB Continuation', type: 'Continuation', description: 'Тренд активний, ціна повертається до untested Order Block, реагує і продовжує тренд.', confirmation: ['Чіткий HTF тренд', 'Untested OB', 'Reaction від OB', 'LTF MSS', 'FVG в напрямку'] },
    { id: 'smt_divergence', name: 'SMT Divergence', type: 'Reversal Filter', description: 'Корельовані інструменти не оновлюють екстремум одночасно. Використовуй як фільтр, не як самостійний сигнал.', confirmation: ['Дивергенція на ключовому рівні', 'Кореляція', 'MSS підтверджує', 'POI узгоджений'] },
    { id: 'breaker_block', name: 'Breaker Block', type: 'Reversal', description: 'Order Block був пробитий і тепер працює у протилежний бік. Вхід часто від 50% пробитого блоку.', confirmation: ['Original OB пробитий тілом', 'MSS у новому напрямку', 'FVG після MSS', 'Ретест 50% BB', 'Killzone'] },
    { id: 'inducement', name: 'Inducement', type: 'Reversal', description: 'Штучна ліквідність манить ритейл перед головним POI. Вхід тільки після зняття inducement і реакції.', confirmation: ['HTF POI', 'Inducement видно', 'Sweep inducement', 'Reaction від HTF POI', 'MSS на LTF'] }
  ];

  const ROUTINE = [
    ['07:30', 'Перегляд календаря — red folder news сьогодні?'], ['08:00', 'Top-Down аналіз: 1W → 1D → 4H → 1H'], ['08:30', 'Гіпотези на день А і Б'], ['09:00', 'London killzone — спостереження'], ['10:00', 'OTT #1 — потенційний вхід'], ['12:00', 'Оцінка LO, перерва'], ['14:00', 'NY killzone — основна доставка'], ['17:00', 'Закриття NY KZ'], ['19:30', 'Журнал і статистика'], ['20:00', 'Без графіків']
  ];

  const defaultState = () => ({
    activeTab: 'dashboard',
    settings: { ...DEFAULT_SETTINGS },
    watchlistFx: ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'],
    watchlistIdx: ['NAS100', 'US30'],
    rules: ['Не торгую без HTF narrative', 'Тільки A+ сетапи з PD Array', 'Killzones only: LO / NY', 'Після 2 SL поспіль — стоп на день', 'BE при +1R, частковий тейк при TP1', 'Не торгую за 30 хв до новин', 'Журнал заповнюю одразу після угоди', 'Не доливаюсь в збиток. Ніколи.'],
    goals: [{ id: uid(), text: 'Win Rate ≥ 50% за місяць', done: false }, { id: uid(), text: 'Avg R:R ≥ 2.5', done: false }, { id: uid(), text: 'Profit Factor ≥ 1.8', done: false }, { id: uid(), text: 'Журнал на 100% угод', done: false }],
    checklistStates: {},
    trades: seedTrades(),
    mistakes: ['FOMO entry', 'Moved stop loss', 'Entered before news', 'No HTF narrative'],
    disciplineLog: []
  });

  let state = loadState();
  let tempTrade = null;

  function seedTrades() {
    return [
      { id: uid(), date: today(), instrument: 'EURUSD', session: 'London', setup: 'Liquidity Sweep', direction: 'Long', risk: 75, rr: 2.4, result: 'Win', pnl: 180, notes: 'Sweep PDL, bullish MSS, partial at 1R.' },
      { id: uid(), date: today(), instrument: 'NAS100', session: 'NY', setup: 'OB Continuation', direction: 'Short', risk: 75, rr: 1.0, result: 'Loss', pnl: -75, notes: 'Entered a little early; wait for closure next time.' }
    ];
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return { ...defaultState(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...(parsed?.settings || {}) } };
    } catch (_) {
      return defaultState();
    }
  }

  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function setState(patch) { state = { ...state, ...patch }; saveState(); render(); }

  function stats() {
    const trades = state.trades || [];
    const wins = trades.filter((t) => t.result === 'Win');
    const losses = trades.filter((t) => t.result === 'Loss');
    const pnl = trades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
    const grossWin = wins.reduce((sum, t) => sum + Math.max(0, Number(t.pnl || 0)), 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + Math.min(0, Number(t.pnl || 0)), 0));
    const todayTrades = trades.filter((t) => t.date === today());
    return {
      count: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
      pnl,
      avgR: trades.length ? trades.reduce((sum, t) => sum + Number(t.rr || 0), 0) / trades.length : 0,
      profitFactor: grossLoss ? grossWin / grossLoss : grossWin ? grossWin : 0,
      todayPnl: todayTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0),
      todayRiskUsed: todayTrades.reduce((sum, t) => sum + Number(t.risk || 0), 0)
    };
  }

  function render() {
    const app = $('#app');
    const s = stats();
    const tabs = [
      ['dashboard', 'Dashboard', '📊'], ['checklists', 'Checklists', '✅'], ['journal', 'Journal', '📓'], ['playbook', 'Playbook', '📚'], ['risk', 'Risk', '🛡️'], ['compound', 'Calculator', '💹'], ['plan', 'Plan', '🗓️'], ['statistics', 'Stats', '📈'], ['psychology', 'Psychology', '🧠']
    ];
    app.innerHTML = `
      <div class="min-h-screen bg-grid">
        <header class="glass sticky top-0 z-20">
          <div class="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p class="text-emerald-400 text-xs font-black uppercase tracking-[0.28em]">Standalone • No React • No build tools</p>
              <h1 class="text-2xl md:text-3xl font-black">Smart Money Workspace</h1>
            </div>
            <div class="flex flex-wrap gap-2">${tabs.map(([id, label, icon]) => `<button class="tab btn ${state.activeTab === id ? 'active' : ''}" data-tab="${id}">${icon} ${label}</button>`).join('')}</div>
          </div>
        </header>
        <div class="tw-note max-w-7xl mx-auto mt-4 px-4"><div class="panel p-3 text-amber-200 text-sm">Tailwind CDN did not load; fallback CSS is active so the app remains usable.</div></div>
        <main class="max-w-7xl mx-auto p-4 md:p-6">${renderTab(s)}</main>
      </div>`;
    bindCommon();
    bindTab();
  }

  function renderTab(s) {
    switch (state.activeTab) {
      case 'checklists': return renderChecklists();
      case 'journal': return renderJournal();
      case 'playbook': return renderPlaybook();
      case 'risk': return renderRisk(s);
      case 'compound': return renderCompound();
      case 'plan': return renderPlan();
      case 'statistics': return renderStatistics(s);
      case 'psychology': return renderPsychology();
      default: return renderDashboard(s);
    }
  }

  function statCard(label, value, sub, accent = 'emerald') {
    const colors = { emerald: 'text-emerald-300', red: 'text-red-300', amber: 'text-amber-300', sky: 'text-sky-300', violet: 'text-violet-300' };
    return `<div class="panel p-4"><p class="text-xs text-zinc-500 uppercase font-bold tracking-wider">${label}</p><div class="text-2xl font-black ${colors[accent] || colors.emerald} mt-1">${value}</div>${sub ? `<p class="text-xs text-zinc-500 mt-1">${sub}</p>` : ''}</div>`;
  }
  function panel(title, body, action = '') { return `<section class="panel p-4 md:p-5"><div class="flex items-center justify-between gap-3 mb-4"><h2 class="font-black text-lg">${title}</h2>${action}</div>${body}</section>`; }

  function renderDashboard(s) {
    const dailyLimit = state.settings.accountSize * state.settings.maxDailyRiskPct / 100;
    const goalDone = state.goals.filter((g) => g.done).length;
    return `<div class="space-y-5">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        ${statCard('Account', money(state.settings.accountSize, state.settings.currency), `${pct(state.settings.riskPerTradePct)} risk/trade`, 'sky')}
        ${statCard('Today P&L', money(s.todayPnl, state.settings.currency), `${s.count} total trades`, s.todayPnl >= 0 ? 'emerald' : 'red')}
        ${statCard('Win Rate', pct(s.winRate), `${s.wins}W / ${s.losses}L`, 'violet')}
        ${statCard('Daily Risk', money(s.todayRiskUsed, state.settings.currency), `${money(dailyLimit, state.settings.currency)} limit`, s.todayRiskUsed > dailyLimit ? 'red' : 'amber')}
        ${statCard('Profit Factor', s.profitFactor.toFixed(2), `Avg R ${s.avgR.toFixed(2)}`, 'emerald')}
      </div>
      <div class="grid layout gap-5" style="grid-template-columns: 1.2fr .8fr;">
        ${panel('Trading Rules', `<div class="space-y-2">${state.rules.map((r, i) => `<label class="flex gap-3 items-start p-3 rounded-xl bg-zinc-900/70 border border-zinc-800"><span class="text-red-400 font-black">${i + 1}</span><span>${escapeHtml(r)}</span></label>`).join('')}</div>`)}
        ${panel('Monthly Goals', `<div class="space-y-3">${state.goals.map((g) => `<label class="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800"><input class="goal-toggle !w-4" type="checkbox" data-id="${g.id}" ${g.done ? 'checked' : ''}><span class="${g.done ? 'line-through text-zinc-500' : ''}">${escapeHtml(g.text)}</span></label>`).join('')}<div class="progress"><span style="width:${state.goals.length ? (goalDone / state.goals.length) * 100 : 0}%"></span></div></div>`)}
      </div>
      ${panel('Watchlist', `<div class="grid md:grid-cols-2 gap-4"><div><h3 class="font-bold mb-2 text-zinc-300">FX / Metals</h3><div class="flex flex-wrap gap-2">${state.watchlistFx.map((w) => `<span class="chip">${escapeHtml(w)}</span>`).join('')}</div></div><div><h3 class="font-bold mb-2 text-zinc-300">Indices</h3><div class="flex flex-wrap gap-2">${state.watchlistIdx.map((w) => `<span class="chip">${escapeHtml(w)}</span>`).join('')}</div></div></div>`)}
    </div>`;
  }

  function renderChecklists() {
    return `<div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">${Object.entries(CHECKLISTS).map(([key, list]) => {
      const checked = state.checklistStates[key] || [];
      const progress = (checked.length / list.items.length) * 100;
      return panel(`${list.icon} ${list.title}`, `<p class="text-sm text-zinc-500 mb-3">${list.description}</p><div class="progress mb-4"><span style="width:${progress}%"></span></div><div class="space-y-2">${list.items.map((item, i) => `<label class="flex gap-3 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800"><input class="checklist-toggle !w-4 mt-1" type="checkbox" data-key="${key}" data-index="${i}" ${checked.includes(i) ? 'checked' : ''}><span class="text-sm ${checked.includes(i) ? 'line-through text-zinc-500' : ''}">${escapeHtml(item)}</span></label>`).join('')}</div><button class="btn mt-4 reset-checklist" data-key="${key}">Reset</button>`);
    }).join('')}</div>`;
  }

  function renderJournal() {
    const instruments = [...state.watchlistFx, ...state.watchlistIdx];
    const form = tempTrade ? renderTradeForm(instruments) : `<button class="btn btn-primary" id="new-trade">＋ Add Trade</button>`;
    return `<div class="space-y-5">${panel('Trade Journal', form)}${panel('Trades', `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Instrument</th><th>Session</th><th>Setup</th><th>Dir</th><th>Risk</th><th>R:R</th><th>Result</th><th>P&L</th><th></th></tr></thead><tbody>${state.trades.map((t) => `<tr><td>${escapeHtml(t.date)}</td><td>${escapeHtml(t.instrument)}</td><td>${escapeHtml(t.session)}</td><td>${escapeHtml(t.setup)}</td><td>${escapeHtml(t.direction)}</td><td>${money(t.risk, state.settings.currency)}</td><td>${Number(t.rr || 0).toFixed(2)}</td><td><span class="chip ${t.result === 'Win' ? 'text-emerald-300' : t.result === 'Loss' ? 'text-red-300' : 'text-zinc-300'}">${escapeHtml(t.result)}</span></td><td class="${Number(t.pnl) >= 0 ? 'text-emerald-300' : 'text-red-300'} font-bold">${money(t.pnl, state.settings.currency)}</td><td><button class="btn edit-trade" data-id="${t.id}">Edit</button> <button class="btn btn-danger delete-trade" data-id="${t.id}">Delete</button></td></tr>`).join('')}</tbody></table></div>`)}</div>`;
  }

  function renderTradeForm(instruments) {
    const t = tempTrade;
    return `<form id="trade-form" class="grid md:grid-cols-4 gap-3">
      ${field('Date', `<input name="date" type="date" value="${escapeHtml(t.date || today())}">`)}
      ${field('Instrument', `<select name="instrument">${instruments.map((i) => `<option ${t.instrument === i ? 'selected' : ''}>${escapeHtml(i)}</option>`).join('')}</select>`)}
      ${field('Session', `<select name="session">${['London', 'NY', 'Asia', 'Other'].map((i) => `<option ${t.session === i ? 'selected' : ''}>${i}</option>`).join('')}</select>`)}
      ${field('Setup', `<select name="setup">${PLAYBOOK.map((p) => `<option ${t.setup === p.name ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select>`)}
      ${field('Direction', `<select name="direction">${['Long', 'Short'].map((i) => `<option ${t.direction === i ? 'selected' : ''}>${i}</option>`).join('')}</select>`)}
      ${field('Risk', `<input name="risk" type="number" step="0.01" value="${escapeHtml(t.risk || '')}">`)}
      ${field('R:R', `<input name="rr" type="number" step="0.1" value="${escapeHtml(t.rr || '')}">`)}
      ${field('Result', `<select name="result">${['Win', 'Loss', 'BE', 'Open'].map((i) => `<option ${t.result === i ? 'selected' : ''}>${i}</option>`).join('')}</select>`)}
      ${field('P&L', `<input name="pnl" type="number" step="0.01" value="${escapeHtml(t.pnl || '')}">`)}
      <div class="md:col-span-4">${field('Notes', `<textarea name="notes">${escapeHtml(t.notes || '')}</textarea>`)}</div>
      <div class="md:col-span-4 flex gap-2"><button class="btn btn-primary" type="submit">Save Trade</button><button class="btn" type="button" id="cancel-trade">Cancel</button></div>
    </form>`;
  }
  function field(label, html) { return `<label class="block"><span class="block text-xs uppercase tracking-wider font-bold text-zinc-500 mb-1">${label}</span>${html}</label>`; }

  function renderPlaybook() {
    return `<div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">${PLAYBOOK.map((p) => panel(`${p.name} <span class="chip">${p.type}</span>`, `<p class="text-sm text-zinc-400 mb-4">${escapeHtml(p.description)}</p><h3 class="text-xs uppercase tracking-wider text-zinc-500 font-black mb-2">Confirmation</h3><ul class="space-y-2">${p.confirmation.map((c) => `<li class="flex gap-2 text-sm"><span class="text-emerald-400">✓</span>${escapeHtml(c)}</li>`).join('')}</ul>`)).join('')}</div>`;
  }

  function renderRisk(s) {
    const dailyLimit = state.settings.accountSize * state.settings.maxDailyRiskPct / 100;
    return `<div class="space-y-5"><div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">${statCard('Daily Limit', money(dailyLimit, state.settings.currency), pct(state.settings.maxDailyRiskPct), 'amber')}${statCard('Used Today', money(s.todayRiskUsed, state.settings.currency), pct(dailyLimit ? s.todayRiskUsed / dailyLimit * 100 : 0), s.todayRiskUsed > dailyLimit ? 'red' : 'emerald')}${statCard('Max Drawdown', money(state.settings.accountSize * state.settings.maxDrawdownPct / 100, state.settings.currency), pct(state.settings.maxDrawdownPct), 'red')}${statCard('Per Trade', money(state.settings.accountSize * state.settings.riskPerTradePct / 100, state.settings.currency), pct(state.settings.riskPerTradePct), 'sky')}</div>
    <div class="grid layout gap-5" style="grid-template-columns: 1fr 1fr;">${panel('Position Size Calculator', renderCalc())}${panel('Risk Parameters', renderSettings())}</div></div>`;
  }
  function renderCalc() { return `<form id="calc-form" class="space-y-3"><div class="grid sm:grid-cols-3 gap-3">${field('Entry', '<input name="entry" type="number" step="0.00001" placeholder="1.0850">')}${field('Stop Loss', '<input name="sl" type="number" step="0.00001" placeholder="1.0820">')}${field('Risk %', `<input name="riskPct" type="number" step="0.1" value="${state.settings.riskPerTradePct}">`)}</div><button class="btn btn-primary" type="submit">Calculate</button><div id="calc-result" class="mt-4 text-sm text-zinc-400">Enter values to calculate approximate FX lot size.</div></form>`; }
  function renderSettings() { return `<form id="settings-form" class="grid sm:grid-cols-2 gap-3">${field('Account Size', `<input name="accountSize" type="number" value="${state.settings.accountSize}">`)}${field('Currency', `<input name="currency" value="${escapeHtml(state.settings.currency)}">`)}${field('Risk per Trade %', `<input name="riskPerTradePct" type="number" step="0.1" value="${state.settings.riskPerTradePct}">`)}${field('Max Daily %', `<input name="maxDailyRiskPct" type="number" step="0.1" value="${state.settings.maxDailyRiskPct}">`)}${field('Max Weekly %', `<input name="weeklyRiskPct" type="number" step="0.1" value="${state.settings.weeklyRiskPct}">`)}${field('Max Drawdown %', `<input name="maxDrawdownPct" type="number" step="0.1" value="${state.settings.maxDrawdownPct}">`)}<div class="sm:col-span-2"><button class="btn btn-primary" type="submit">Save Settings</button></div></form>`; }

  const COMPOUND_PERIODS = { daily: 365, monthly: 12, quarterly: 4, semiannually: 2, annually: 1 };
  const COMPOUND_PERIOD_LABELS = { daily: 'Щодня', monthly: 'Щомісяця', quarterly: 'Щокварталу', semiannually: 'Раз на півроку', annually: 'Раз на рік' };

  function computeCompoundInterest({ principal, contribution, annualRatePct, periodsPerYear, years }) {
    const periodicRate = annualRatePct / 100 / periodsPerYear;
    const totalPeriods = Math.round(periodsPerYear * years);
    const schedule = [];
    for (let year = 1; year <= Math.ceil(years); year += 1) {
      const periodsElapsed = Math.min(totalPeriods, Math.round(periodsPerYear * year));
      const growth = periodicRate === 0 ? 1 : Math.pow(1 + periodicRate, periodsElapsed);
      const balance = principal * growth + (periodicRate === 0 ? contribution * periodsElapsed : contribution * ((growth - 1) / periodicRate));
      const deposited = principal + contribution * periodsElapsed;
      schedule.push({ year, balance, deposited, interest: balance - deposited });
    }
    const final = schedule[schedule.length - 1] || { balance: principal, deposited: principal, interest: 0 };
    return { schedule, finalBalance: final.balance, totalDeposited: final.deposited, totalInterest: final.interest };
  }

  function renderCompound() {
    return `<div class="space-y-5">${panel('Калькулятор складного відсотка', renderCompoundForm())}</div>`;
  }

  function renderCompoundForm() {
    return `<form id="compound-form" class="space-y-4">
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        ${field('Початкова сума', '<input name="principal" type="number" min="0" step="0.01" value="1000">')}
        ${field('Регулярний внесок', '<input name="contribution" type="number" min="0" step="0.01" value="100">')}
        ${field('Річна ставка, %', '<input name="rate" type="number" step="0.01" value="8">')}
        ${field('Термін, років', '<input name="years" type="number" min="1" step="1" value="10">')}
      </div>
      ${field('Період капіталізації / внесків', `<select name="period">${Object.entries(COMPOUND_PERIOD_LABELS).map(([value, label]) => `<option value="${value}" ${value === 'monthly' ? 'selected' : ''}>${label}</option>`).join('')}</select>`)}
      <button class="btn btn-primary" type="submit">Розрахувати</button>
      <div id="compound-result" class="mt-2 text-sm text-zinc-400">Введіть суми, ставку і період, щоб побачити результат.</div>
    </form>`;
  }

  function renderPlan() {
    return `<div class="grid layout gap-5" style="grid-template-columns: .8fr 1.2fr;">${panel('Session Prep', `<ul class="space-y-2">${['Calendar checked', 'HTF bias written', 'Liquidity pools marked', 'POI selected', 'Invalidation clear', 'Risk limit visible'].map((x) => `<li class="flex gap-2"><span class="text-emerald-400">✓</span>${x}</li>`).join('')}</ul>`)}${panel('Daily Routine', `<div class="space-y-2">${ROUTINE.map(([time, task]) => `<div class="flex gap-3 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800"><span class="font-black text-emerald-400 w-14">${time}</span><span>${escapeHtml(task)}</span></div>`).join('')}</div>`)}</div>`;
  }

  function renderStatistics(s) {
    const bySetup = PLAYBOOK.map((p) => [p.name, state.trades.filter((t) => t.setup === p.name).length]).filter((x) => x[1]);
    const max = Math.max(1, ...bySetup.map((x) => x[1]));
    return `<div class="space-y-5"><div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">${statCard('Trades', s.count, 'Total', 'sky')}${statCard('Wins', s.wins, pct(s.winRate), 'emerald')}${statCard('Losses', s.losses, '', 'red')}${statCard('Net P&L', money(s.pnl, state.settings.currency), '', s.pnl >= 0 ? 'emerald' : 'red')}${statCard('Avg R', s.avgR.toFixed(2), 'per trade', 'violet')}</div>${panel('Setups Distribution', bySetup.length ? `<div class="space-y-3">${bySetup.map(([name, count]) => `<div><div class="flex justify-between text-sm mb-1"><span>${escapeHtml(name)}</span><span>${count}</span></div><div class="progress"><span style="width:${count / max * 100}%"></span></div></div>`).join('')}</div>` : '<p class="text-zinc-500">No closed trades yet.</p>')}</div>`;
  }

  function renderPsychology() {
    return `<div class="grid layout gap-5" style="grid-template-columns: 1fr 1fr;">${panel('Mistake Library', `<div class="space-y-2">${state.mistakes.map((m) => `<div class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-100">⚠ ${escapeHtml(m)}</div>`).join('')}</div>`)}${panel('Discipline Log', `<form id="discipline-form" class="space-y-3">${field('Score 1-10', '<input name="score" type="number" min="1" max="10" value="8">')}${field('Reflection', '<textarea name="text" placeholder="What did I follow well? What needs improvement?"></textarea>')}<button class="btn btn-primary">Add Reflection</button></form><div class="space-y-2 mt-4">${state.disciplineLog.map((d) => `<div class="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800"><div class="text-xs text-zinc-500">${escapeHtml(d.date)} • Score ${escapeHtml(d.score)}/10</div><div>${escapeHtml(d.text)}</div></div>`).join('')}</div>`)}</div>`;
  }

  function bindCommon() {
    $$('.tab').forEach((button) => button.addEventListener('click', () => setState({ activeTab: button.dataset.tab })));
    $$('.goal-toggle').forEach((input) => input.addEventListener('change', () => setState({ goals: state.goals.map((g) => g.id === input.dataset.id ? { ...g, done: input.checked } : g) })));
  }

  function bindTab() {
    $$('.checklist-toggle').forEach((input) => input.addEventListener('change', () => {
      const key = input.dataset.key;
      const index = Number(input.dataset.index);
      const current = new Set(state.checklistStates[key] || []);
      input.checked ? current.add(index) : current.delete(index);
      setState({ checklistStates: { ...state.checklistStates, [key]: [...current].sort((a, b) => a - b) } });
    }));
    $$('.reset-checklist').forEach((button) => button.addEventListener('click', () => setState({ checklistStates: { ...state.checklistStates, [button.dataset.key]: [] } })));

    $('#new-trade')?.addEventListener('click', () => { tempTrade = { id: uid(), date: today(), instrument: state.watchlistFx[0], session: 'London', setup: PLAYBOOK[0].name, direction: 'Long', result: 'Win', risk: state.settings.accountSize * state.settings.riskPerTradePct / 100, rr: 2, pnl: '' }; render(); });
    $$('.edit-trade').forEach((button) => button.addEventListener('click', () => { tempTrade = { ...state.trades.find((t) => t.id === button.dataset.id) }; render(); }));
    $$('.delete-trade').forEach((button) => button.addEventListener('click', () => { if (confirm('Delete this trade?')) setState({ trades: state.trades.filter((t) => t.id !== button.dataset.id) }); }));
    $('#cancel-trade')?.addEventListener('click', () => { tempTrade = null; render(); });
    $('#trade-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      const trade = { ...tempTrade, ...data, risk: Number(data.risk || 0), rr: Number(data.rr || 0), pnl: Number(data.pnl || 0) };
      const exists = state.trades.some((t) => t.id === trade.id);
      tempTrade = null;
      setState({ trades: exists ? state.trades.map((t) => t.id === trade.id ? trade : t) : [trade, ...state.trades] });
    });

    $('#settings-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      setState({ settings: { accountSize: Number(data.accountSize || 0), currency: data.currency || '$', riskPerTradePct: Number(data.riskPerTradePct || 0), maxDailyRiskPct: Number(data.maxDailyRiskPct || 0), weeklyRiskPct: Number(data.weeklyRiskPct || 0), maxDrawdownPct: Number(data.maxDrawdownPct || 0) } });
    });
    $('#calc-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      const entry = Number(data.entry); const sl = Number(data.sl); const riskPct = Number(data.riskPct || state.settings.riskPerTradePct);
      const result = $('#calc-result');
      if (!entry || !sl || entry === sl) { result.innerHTML = '<span class="text-red-300">Entry and stop loss must be different numbers.</span>'; return; }
      const riskAmount = state.settings.accountSize * riskPct / 100;
      const pips = Math.abs(entry - sl) / 0.0001;
      const lots = pips ? riskAmount / (pips * 10) : 0;
      result.innerHTML = `<div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30"><div>Risk Amount: <b>${money(riskAmount, state.settings.currency)}</b></div><div>SL Distance: <b>${pips.toFixed(1)} pips</b></div><div>Approx. Position Size: <b>${lots.toFixed(2)} lots</b></div><p class="text-xs text-zinc-500 mt-2">Approximation uses standard FX pip value ($10 per pip per lot). Adjust for metals, JPY pairs, indices, and broker contract specs.</p></div>`;
    });
    $('#compound-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      const principal = Number(data.principal || 0);
      const contribution = Number(data.contribution || 0);
      const annualRatePct = Number(data.rate || 0);
      const years = Number(data.years || 0);
      const periodsPerYear = COMPOUND_PERIODS[data.period] || 12;
      const result = $('#compound-result');
      if (principal < 0 || contribution < 0 || years <= 0) { result.innerHTML = '<span class="text-red-300">Перевірте введені значення: сума і термін мають бути додатними.</span>'; return; }
      const { schedule, finalBalance, totalDeposited, totalInterest } = computeCompoundInterest({ principal, contribution, annualRatePct, periodsPerYear, years });
      const currency = state.settings.currency;
      result.innerHTML = `
        <div class="grid sm:grid-cols-3 gap-3 mb-4">
          ${statCard('Кінцева сума', money(finalBalance, currency), `За ${years} р. • ${COMPOUND_PERIOD_LABELS[data.period]}`, 'emerald')}
          ${statCard('Внесено всього', money(totalDeposited, currency), 'Початкова сума + внески', 'sky')}
          ${statCard('Нараховані відсотки', money(totalInterest, currency), `${(totalDeposited ? (totalInterest / totalDeposited) * 100 : 0).toFixed(1)}% від внесків`, 'violet')}
        </div>
        <div class="table-wrap"><table><thead><tr><th>Рік</th><th>Внесено</th><th>Відсотки</th><th>Баланс</th></tr></thead><tbody>${schedule.map((row) => `<tr><td>${row.year}</td><td>${money(row.deposited, currency)}</td><td class="text-violet-300">${money(row.interest, currency)}</td><td class="font-bold text-emerald-300">${money(row.balance, currency)}</td></tr>`).join('')}</tbody></table></div>`;
    });
    $('#discipline-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      if (!data.text.trim()) return;
      setState({ disciplineLog: [{ id: uid(), date: today(), score: data.score, text: data.text.trim() }, ...state.disciplineLog] });
    });
  }

  try {
    render();
  } catch (error) {
    console.error(error);
    $('#app').innerHTML = `<main class="max-w-3xl mx-auto p-6"><section class="panel p-6"><h1 class="text-2xl font-black text-red-300">Application error</h1><p class="text-zinc-400 mt-2">The app recovered from a rendering failure. Open the console for details.</p><pre class="mt-4 whitespace-pre-wrap text-sm text-red-200">${escapeHtml(error.stack || error.message)}</pre></section></main>`;
  }
})();
