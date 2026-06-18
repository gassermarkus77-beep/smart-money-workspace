-- ============================================================================
-- FINBERG MARKETS — Billing & Subscriptions
-- Target: PostgreSQL 16+
-- ============================================================================

CREATE TABLE plans (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    key             TEXT            NOT NULL UNIQUE,           -- 'free','pro','premium','institutional'
    name            TEXT            NOT NULL,
    description     TEXT,
    monthly_cents   INTEGER         NOT NULL DEFAULT 0,
    annual_cents    INTEGER         NOT NULL DEFAULT 0,
    currency        CHAR(3)         NOT NULL DEFAULT 'USD',
    features        JSONB           NOT NULL DEFAULT '{}'::jsonb,  -- limits dict
    stripe_monthly_price_id TEXT,
    stripe_annual_price_id  TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    sort_order      INTEGER         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

INSERT INTO plans (key, name, monthly_cents, annual_cents, features, sort_order) VALUES
('free',          'Free',           0,    0,    '{"charts":1,"watchlists":2,"watchlist_syms":20,"indicators_per_chart":3,"alerts":5,"realtime":false}'::jsonb, 0),
('pro',           'Pro',            2495, 23900, '{"charts":4,"watchlists":-1,"watchlist_syms":-1,"indicators_per_chart":25,"alerts":100,"realtime":"crypto"}'::jsonb, 10),
('premium',       'Premium',        4995, 47900, '{"charts":8,"watchlists":-1,"watchlist_syms":-1,"indicators_per_chart":-1,"alerts":500,"realtime":"all","ai":true,"vp":true}'::jsonb, 20),
('institutional', 'Institutional',  49900, 0,   '{"charts":-1,"sso":true,"audit":true,"fix":true,"sla":true,"seats":5}'::jsonb, 30)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE subscriptions (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID            REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id         UUID            NOT NULL REFERENCES plans(id),
    status          TEXT            NOT NULL CHECK (status IN (
                        'trialing','active','past_due','cancelled','incomplete','incomplete_expired','unpaid','paused'
                    )),
    billing_cycle   TEXT            NOT NULL CHECK (billing_cycle IN ('monthly','annual')),
    current_period_start TIMESTAMPTZ,
    current_period_end   TIMESTAMPTZ,
    trial_end       TIMESTAMPTZ,
    cancel_at       TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id     TEXT,
    paypal_subscription_id TEXT UNIQUE,
    coinbase_subscription_id TEXT UNIQUE,
    seats           INTEGER         DEFAULT 1,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CHECK (user_id IS NOT NULL OR organization_id IS NOT NULL)
);

CREATE INDEX idx_subs_user        ON subscriptions (user_id) WHERE status IN ('active','trialing');
CREATE INDEX idx_subs_org         ON subscriptions (organization_id) WHERE status IN ('active','trialing');
CREATE INDEX idx_subs_stripe      ON subscriptions (stripe_subscription_id);

CREATE TABLE invoices (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID            REFERENCES subscriptions(id) ON DELETE SET NULL,
    user_id         UUID            REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID            REFERENCES organizations(id) ON DELETE SET NULL,
    amount_cents    INTEGER         NOT NULL,
    currency        CHAR(3)         NOT NULL,
    tax_cents       INTEGER         NOT NULL DEFAULT 0,
    status          TEXT            NOT NULL,                   -- draft, open, paid, void, uncollectible
    period_start    TIMESTAMPTZ,
    period_end      TIMESTAMPTZ,
    issued_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    paid_at         TIMESTAMPTZ,
    stripe_invoice_id TEXT          UNIQUE,
    pdf_url         TEXT,
    metadata        JSONB
);

CREATE INDEX idx_invoices_user ON invoices (user_id, issued_at DESC);

CREATE TABLE payment_methods (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider        TEXT            NOT NULL CHECK (provider IN ('stripe','paypal','coinbase')),
    provider_method_id TEXT         NOT NULL,
    type            TEXT,                                       -- 'card','sepa','wallet','crypto'
    brand           TEXT,
    last4           TEXT,
    exp_month       INTEGER,
    exp_year        INTEGER,
    is_default      BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_pm_user ON payment_methods (user_id) WHERE is_default;

-- Stripe webhook idempotency
CREATE TABLE webhook_events (
    id              TEXT            PRIMARY KEY,                -- provider event id
    provider        TEXT            NOT NULL,
    type            TEXT            NOT NULL,
    payload         JSONB           NOT NULL,
    received_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    processed_at    TIMESTAMPTZ
);
