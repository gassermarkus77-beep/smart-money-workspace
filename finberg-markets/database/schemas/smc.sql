-- ============================================================================
-- FINBERG SMC AI — Schema
-- Target: PostgreSQL 16+
-- Holds detections, generated scenarios, and backtest results.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- DETECTIONS — every event the detector pipeline emits
-- ----------------------------------------------------------------------------
CREATE TABLE smc_detections (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    instrument_id   UUID            NOT NULL,
    symbol          TEXT            NOT NULL,
    timeframe       TEXT            NOT NULL,
    kind            TEXT            NOT NULL CHECK (kind IN (
        'MS','BOS','CHOCH','MSS','FVG','OB','BB','LIQ_SWEEP',
        'EQH','EQL','PD_ZONE','LIQ_INT','LIQ_EXT',
        'PDH','PDL','PWH','PWL','ASIA_H','ASIA_L',
        'LDN_SWEEP','NY_MANIP'
    )),
    direction       TEXT            CHECK (direction IS NULL OR direction IN ('bull','bear','neutral','high','low')),
    -- canonical price geometry
    price_top       NUMERIC(20,10),
    price_bottom    NUMERIC(20,10),
    price           NUMERIC(20,10),
    -- temporal
    started_at      TIMESTAMPTZ     NOT NULL,
    ended_at        TIMESTAMPTZ,
    -- status
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    mitigated       BOOLEAN         NOT NULL DEFAULT FALSE,
    mitigated_at    TIMESTAMPTZ,
    -- arbitrary payload (specific to detector kind)
    payload         JSONB           NOT NULL DEFAULT '{}'::jsonb,
    detector_ver    TEXT            NOT NULL DEFAULT 'v1',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_smc_det_symbol_tf      ON smc_detections (symbol, timeframe, started_at DESC);
CREATE INDEX idx_smc_det_kind_active    ON smc_detections (kind) WHERE is_active;
CREATE INDEX idx_smc_det_started        ON smc_detections (started_at DESC);

-- ----------------------------------------------------------------------------
-- SCENARIOS — composed trading scenarios with HTF→LTF reasoning
-- ----------------------------------------------------------------------------
CREATE TABLE smc_scenarios (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    instrument_id       UUID            NOT NULL,
    symbol              TEXT            NOT NULL,

    -- bias inputs
    htf_bias            TEXT            NOT NULL CHECK (htf_bias IN ('bullish','bearish','neutral')),
    htf_bias_strength   NUMERIC(4,3)    NOT NULL,
    htf_timeframes      TEXT[]          NOT NULL,            -- ['D1','H4','H1']
    entry_timeframe     TEXT            NOT NULL,            -- 'M15' | 'M5' | 'M1'

    -- structure / trigger
    trigger_event_id    UUID            REFERENCES smc_detections(id),
    setup_signature     TEXT            NOT NULL,            -- e.g. 'sweep_asia_low+mss_m5+ote_h1'

    -- the proposed trade
    direction           TEXT            NOT NULL CHECK (direction IN ('long','short')),
    entry_low           NUMERIC(20,10)  NOT NULL,
    entry_high          NUMERIC(20,10)  NOT NULL,
    stop_price          NUMERIC(20,10)  NOT NULL,
    risk_reward         NUMERIC(8,3)    NOT NULL,

    -- narrative
    headline            TEXT            NOT NULL,
    narrative_md        TEXT            NOT NULL,
    risk_warning_md     TEXT            NOT NULL,

    -- confidence (transparent breakdown stored alongside aggregate)
    confidence          NUMERIC(4,3)    NOT NULL,
    confidence_breakdown JSONB          NOT NULL,            -- {htf_bias_strength: .., historical_accuracy: .., ...}

    -- lifecycle
    status              TEXT            NOT NULL DEFAULT 'open'
                                        CHECK (status IN ('open','triggered','invalidated','tp1','tp2','tp3','expired','cancelled')),
    triggered_at        TIMESTAMPTZ,
    closed_at           TIMESTAMPTZ,
    realized_r          NUMERIC(8,4),

    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_smc_scn_symbol_open  ON smc_scenarios (symbol, created_at DESC) WHERE status = 'open';
CREATE INDEX idx_smc_scn_sig          ON smc_scenarios (setup_signature, created_at DESC);
CREATE INDEX idx_smc_scn_confidence   ON smc_scenarios (confidence DESC) WHERE status = 'open';

CREATE TABLE smc_scenario_targets (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id     UUID            NOT NULL REFERENCES smc_scenarios(id) ON DELETE CASCADE,
    rank            SMALLINT        NOT NULL CHECK (rank BETWEEN 1 AND 5),
    price           NUMERIC(20,10)  NOT NULL,
    label           TEXT            NOT NULL,                -- 'PDH','external_liq','premium_extreme',...
    r_multiple      NUMERIC(8,3)    NOT NULL,                -- R from entry
    hit_at          TIMESTAMPTZ,
    UNIQUE (scenario_id, rank)
);

CREATE INDEX idx_scn_targets_open ON smc_scenario_targets (scenario_id) WHERE hit_at IS NULL;

-- ----------------------------------------------------------------------------
-- BACKTESTING
-- ----------------------------------------------------------------------------
CREATE TABLE smc_backtest_runs (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID,                                    -- nullable: system-level rollups
    label           TEXT,
    instrument_id   UUID            NOT NULL,
    symbol          TEXT            NOT NULL,
    timeframe       TEXT            NOT NULL,
    bars_from       TIMESTAMPTZ     NOT NULL,
    bars_to         TIMESTAMPTZ     NOT NULL,
    detector_ver    TEXT            NOT NULL,
    config          JSONB           NOT NULL DEFAULT '{}'::jsonb,
    -- aggregated metrics
    trades          INTEGER         NOT NULL DEFAULT 0,
    wins            INTEGER         NOT NULL DEFAULT 0,
    losses          INTEGER         NOT NULL DEFAULT 0,
    win_rate        NUMERIC(5,4),
    avg_r           NUMERIC(8,4),
    profit_factor   NUMERIC(8,4),
    max_drawdown_r  NUMERIC(8,4),
    expectancy_r    NUMERIC(8,4),
    started_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    finished_at     TIMESTAMPTZ,
    status          TEXT            NOT NULL DEFAULT 'running'
                                    CHECK (status IN ('running','done','failed'))
);

CREATE INDEX idx_bt_runs_user ON smc_backtest_runs (user_id, started_at DESC);

CREATE TABLE smc_backtest_trades (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id          UUID            NOT NULL REFERENCES smc_backtest_runs(id) ON DELETE CASCADE,
    scenario_sig    TEXT            NOT NULL,
    direction       TEXT            NOT NULL CHECK (direction IN ('long','short')),
    entered_at      TIMESTAMPTZ     NOT NULL,
    exited_at       TIMESTAMPTZ     NOT NULL,
    entry_price     NUMERIC(20,10)  NOT NULL,
    exit_price      NUMERIC(20,10)  NOT NULL,
    stop_price      NUMERIC(20,10)  NOT NULL,
    r_multiple      NUMERIC(8,4)    NOT NULL,
    target_hit      SMALLINT,                                -- 1..5 or NULL if SL
    bars_held       INTEGER
);

CREATE INDEX idx_bt_trades_run ON smc_backtest_trades (run_id);
CREATE INDEX idx_bt_trades_sig ON smc_backtest_trades (scenario_sig);

-- ----------------------------------------------------------------------------
-- ACCURACY ROLLUP — nightly job aggregates from completed trades
-- ----------------------------------------------------------------------------
CREATE TABLE smc_accuracy_rollup (
    setup_signature TEXT            NOT NULL,
    asset_class     TEXT            NOT NULL,
    timeframe       TEXT            NOT NULL,
    window_days     INTEGER         NOT NULL CHECK (window_days IN (30, 90, 365)),
    sample_size     INTEGER         NOT NULL,
    win_rate        NUMERIC(5,4)    NOT NULL,
    avg_r           NUMERIC(8,4)    NOT NULL,
    expectancy_r    NUMERIC(8,4)    NOT NULL,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (setup_signature, asset_class, timeframe, window_days)
);

-- ----------------------------------------------------------------------------
-- TRIGGERS — keep updated_at fresh
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION smc_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_smc_scenarios_updated
    BEFORE UPDATE ON smc_scenarios
    FOR EACH ROW EXECUTE FUNCTION smc_set_updated_at();
