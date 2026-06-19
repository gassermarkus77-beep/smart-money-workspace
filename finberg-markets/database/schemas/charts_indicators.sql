-- ============================================================================
-- FINBERG MARKETS — Chart Layouts, Indicators, Drawings, Watchlists
-- Target: PostgreSQL 16+
-- ============================================================================

-- ----------------------------------------------------------------------------
-- WATCHLISTS
-- ----------------------------------------------------------------------------
CREATE TABLE watchlists (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT            NOT NULL,
    color           TEXT,
    position        INTEGER         NOT NULL DEFAULT 0,
    is_default      BOOLEAN         NOT NULL DEFAULT FALSE,
    is_shared       BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_watchlists_user ON watchlists (user_id, position);

CREATE TABLE watchlist_items (
    watchlist_id    UUID            NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    instrument_id   UUID            NOT NULL,                   -- FK to instruments (cross-db, soft ref)
    position        INTEGER         NOT NULL DEFAULT 0,
    added_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    note            TEXT,
    PRIMARY KEY (watchlist_id, instrument_id)
);

CREATE INDEX idx_watchlist_items_pos ON watchlist_items (watchlist_id, position);

-- ----------------------------------------------------------------------------
-- CHART LAYOUTS
-- ----------------------------------------------------------------------------
CREATE TABLE chart_layouts (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT            NOT NULL,
    layout_type     TEXT            NOT NULL DEFAULT 'single'
                                    CHECK (layout_type IN ('single','2v','2h','3','4','6','8')),
    panes           JSONB           NOT NULL,                   -- per-pane: symbol, timeframe, indicators, drawings
    theme           TEXT            NOT NULL DEFAULT 'dark',
    is_default      BOOLEAN         NOT NULL DEFAULT FALSE,
    is_template     BOOLEAN         NOT NULL DEFAULT FALSE,
    share_slug      TEXT            UNIQUE,                     -- if shared publicly
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_chart_layouts_user ON chart_layouts (user_id, updated_at DESC);

-- ----------------------------------------------------------------------------
-- INDICATOR INSTANCES (per-chart configuration)
-- ----------------------------------------------------------------------------
CREATE TABLE indicator_instances (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    chart_layout_id UUID            NOT NULL REFERENCES chart_layouts(id) ON DELETE CASCADE,
    pane_index      INTEGER         NOT NULL,                   -- which pane in the layout
    indicator_key   TEXT            NOT NULL,                   -- 'ema', 'rsi', or 'script:abc123'
    script_id       UUID,                                       -- if user script
    inputs          JSONB           NOT NULL DEFAULT '{}'::jsonb,
    style           JSONB           NOT NULL DEFAULT '{}'::jsonb,
    overlay         BOOLEAN         NOT NULL DEFAULT TRUE,
    position        INTEGER         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_ind_inst_layout ON indicator_instances (chart_layout_id);

-- ----------------------------------------------------------------------------
-- USER SCRIPTS (FinScript)
-- ----------------------------------------------------------------------------
CREATE TABLE user_scripts (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT            NOT NULL,
    description     TEXT,
    kind            TEXT            NOT NULL CHECK (kind IN ('indicator','strategy','library')),
    source          TEXT            NOT NULL,                   -- FinScript source
    compiled        TEXT,                                       -- transpiled ES2022
    version         INTEGER         NOT NULL DEFAULT 1,
    visibility      TEXT            NOT NULL DEFAULT 'private'
                                    CHECK (visibility IN ('private','unlisted','public','marketplace')),
    price_cents     INTEGER         DEFAULT 0,                  -- 0 = free
    install_count   INTEGER         NOT NULL DEFAULT 0,
    avg_rating      NUMERIC(3,2),
    tags            TEXT[],
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_scripts_user       ON user_scripts (user_id, updated_at DESC);
CREATE INDEX idx_user_scripts_visibility ON user_scripts (visibility) WHERE visibility != 'private';
CREATE INDEX idx_user_scripts_tags       ON user_scripts USING gin (tags);

-- ----------------------------------------------------------------------------
-- DRAWINGS (saved per chart layout pane)
-- ----------------------------------------------------------------------------
CREATE TABLE drawings (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    chart_layout_id UUID            NOT NULL REFERENCES chart_layouts(id) ON DELETE CASCADE,
    pane_index      INTEGER         NOT NULL,
    tool            TEXT            NOT NULL,                   -- trendline, fib, rect, ...
    points          JSONB           NOT NULL,                   -- [{t, p}, ...]
    style           JSONB           NOT NULL DEFAULT '{}'::jsonb,
    locked          BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_drawings_layout ON drawings (chart_layout_id, pane_index);
