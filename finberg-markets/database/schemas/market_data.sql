-- ============================================================================
-- FINBERG MARKETS — Market Data Schema (TimescaleDB)
-- Target: PostgreSQL 16 + TimescaleDB 2.16+
-- Covers: symbols, OHLCV hypertables, ticks, order book snapshots
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- INSTRUMENTS / SYMBOLS
-- ----------------------------------------------------------------------------
CREATE TABLE instruments (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol          TEXT            NOT NULL,                   -- e.g. AAPL, BTCUSDT
    exchange        TEXT            NOT NULL,                   -- e.g. NASDAQ, BINANCE
    asset_class     TEXT            NOT NULL                    -- stock | forex | crypto | index | commodity | bond
                                    CHECK (asset_class IN ('stock','forex','crypto','index','commodity','bond')),
    quote_currency  TEXT,                                       -- USD, USDT, EUR
    name            TEXT,
    sector          TEXT,
    industry        TEXT,
    country         CHAR(2),
    isin            TEXT,
    figi            TEXT,
    tick_size       NUMERIC(20,10)  NOT NULL DEFAULT 0.01,
    lot_size        NUMERIC(20,10)  NOT NULL DEFAULT 1,
    trading_hours   JSONB,                                       -- {open: "09:30", close: "16:00", tz: "America/New_York"}
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    primary_provider TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (symbol, exchange)
);

CREATE INDEX idx_instruments_asset      ON instruments (asset_class) WHERE is_active;
CREATE INDEX idx_instruments_symbol_trgm ON instruments USING gin (symbol gin_trgm_ops);
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----------------------------------------------------------------------------
-- OHLCV BARS (Timescale hypertable)
-- One table per timeframe — partitioned by time, compressed after 7d
-- ----------------------------------------------------------------------------
CREATE TABLE bars_1m (
    instrument_id   UUID            NOT NULL,
    time            TIMESTAMPTZ     NOT NULL,
    open            NUMERIC(20,10)  NOT NULL,
    high            NUMERIC(20,10)  NOT NULL,
    low             NUMERIC(20,10)  NOT NULL,
    close           NUMERIC(20,10)  NOT NULL,
    volume          NUMERIC(28,10)  NOT NULL DEFAULT 0,
    trades          INTEGER,
    vwap            NUMERIC(20,10),
    PRIMARY KEY (instrument_id, time)
);

SELECT create_hypertable('bars_1m', 'time', chunk_time_interval => INTERVAL '1 day');

ALTER TABLE bars_1m SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'instrument_id',
    timescaledb.compress_orderby   = 'time DESC'
);

SELECT add_compression_policy('bars_1m', INTERVAL '7 days');

-- Continuous aggregate — 5m
CREATE MATERIALIZED VIEW bars_5m
WITH (timescaledb.continuous) AS
SELECT
    instrument_id,
    time_bucket('5 minutes', time) AS time,
    first(open, time)   AS open,
    max(high)           AS high,
    min(low)            AS low,
    last(close, time)   AS close,
    sum(volume)         AS volume,
    sum(trades)         AS trades
FROM bars_1m
GROUP BY instrument_id, time_bucket('5 minutes', time)
WITH NO DATA;

SELECT add_continuous_aggregate_policy('bars_5m',
    start_offset => INTERVAL '1 day',
    end_offset   => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute');

-- 15m, 1h, 4h, 1d follow the same pattern. Generated via migration.

CREATE MATERIALIZED VIEW bars_1h
WITH (timescaledb.continuous) AS
SELECT
    instrument_id,
    time_bucket('1 hour', time) AS time,
    first(open, time) AS open, max(high) AS high, min(low) AS low,
    last(close, time) AS close, sum(volume) AS volume, sum(trades) AS trades
FROM bars_1m
GROUP BY instrument_id, time_bucket('1 hour', time)
WITH NO DATA;

CREATE MATERIALIZED VIEW bars_1d
WITH (timescaledb.continuous) AS
SELECT
    instrument_id,
    time_bucket('1 day', time) AS time,
    first(open, time) AS open, max(high) AS high, min(low) AS low,
    last(close, time) AS close, sum(volume) AS volume, sum(trades) AS trades
FROM bars_1m
GROUP BY instrument_id, time_bucket('1 day', time)
WITH NO DATA;

-- ----------------------------------------------------------------------------
-- TICKS (last trades) — short retention, then archived to S3 + ClickHouse
-- ----------------------------------------------------------------------------
CREATE TABLE ticks (
    instrument_id   UUID            NOT NULL,
    time            TIMESTAMPTZ     NOT NULL,
    price           NUMERIC(20,10)  NOT NULL,
    size            NUMERIC(28,10)  NOT NULL,
    side            CHAR(1)         CHECK (side IN ('B','S','U')),  -- buy/sell/unknown
    trade_id        TEXT,
    conditions      INTEGER[]
);

SELECT create_hypertable('ticks', 'time',
    chunk_time_interval => INTERVAL '1 hour');

ALTER TABLE ticks SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'instrument_id'
);

SELECT add_compression_policy('ticks', INTERVAL '1 day');
SELECT add_retention_policy('ticks', INTERVAL '30 days');     -- archive older to S3

CREATE INDEX idx_ticks_instrument_time ON ticks (instrument_id, time DESC);

-- ----------------------------------------------------------------------------
-- ORDER BOOK SNAPSHOTS (L2)
-- ----------------------------------------------------------------------------
CREATE TABLE order_book_snapshots (
    instrument_id   UUID            NOT NULL,
    time            TIMESTAMPTZ     NOT NULL,
    bids            JSONB           NOT NULL,                   -- [[price, size], ...]
    asks            JSONB           NOT NULL,
    sequence        BIGINT
);

SELECT create_hypertable('order_book_snapshots', 'time',
    chunk_time_interval => INTERVAL '1 hour');

SELECT add_retention_policy('order_book_snapshots', INTERVAL '7 days');

-- ----------------------------------------------------------------------------
-- DATA PROVIDER HEALTH (for the cost-aware router)
-- ----------------------------------------------------------------------------
CREATE TABLE provider_health (
    provider        TEXT            NOT NULL,
    asset_class     TEXT            NOT NULL,
    measured_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    latency_p50_ms  INTEGER,
    latency_p99_ms  INTEGER,
    error_rate      NUMERIC(5,4),                              -- 0.0..1.0
    monthly_cost    NUMERIC(12,2),
    quota_used      INTEGER,
    quota_limit     INTEGER,
    PRIMARY KEY (provider, asset_class, measured_at)
);

SELECT create_hypertable('provider_health', 'measured_at',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE);
