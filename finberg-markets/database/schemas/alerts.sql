-- ============================================================================
-- FINBERG MARKETS — Alerts Schema
-- Target: PostgreSQL 16+
-- ============================================================================

CREATE TABLE alerts (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instrument_id   UUID            NOT NULL,
    name            TEXT,
    type            TEXT            NOT NULL CHECK (type IN (
                        'price_cross','price_above','price_below',
                        'volume_spike','indicator','drawing','news','ai_pattern'
                    )),
    condition       JSONB           NOT NULL,                   -- typed payload per type
    trigger_mode    TEXT            NOT NULL DEFAULT 'once'
                                    CHECK (trigger_mode IN ('once','every_time','once_per_bar')),
    expires_at      TIMESTAMPTZ,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    channels        TEXT[]          NOT NULL DEFAULT ARRAY['in_app'],
    webhook_url     TEXT,
    telegram_chat_id TEXT,
    message         TEXT,
    cooldown_seconds INTEGER        NOT NULL DEFAULT 60,
    last_fired_at   TIMESTAMPTZ,
    fire_count      INTEGER         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_active      ON alerts (instrument_id) WHERE is_active;
CREATE INDEX idx_alerts_user        ON alerts (user_id, created_at DESC);
CREATE INDEX idx_alerts_expiring    ON alerts (expires_at) WHERE expires_at IS NOT NULL AND is_active;

CREATE TABLE alert_events (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id        UUID            NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    fired_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    trigger_value   NUMERIC(20,10),
    snapshot        JSONB,                                      -- payload sent to channels
    delivery_status JSONB                                       -- per-channel status
);

CREATE INDEX idx_alert_events_alert ON alert_events (alert_id, fired_at DESC);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS (multi-channel sender outbox)
-- ----------------------------------------------------------------------------
CREATE TABLE notifications_outbox (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel         TEXT            NOT NULL CHECK (channel IN (
                        'in_app','email','push','telegram','slack','discord','webhook','sms'
                    )),
    template        TEXT            NOT NULL,
    payload         JSONB           NOT NULL,
    idempotency_key TEXT            UNIQUE,
    status          TEXT            NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending','sent','failed','dead')),
    attempts        INTEGER         NOT NULL DEFAULT 0,
    last_error      TEXT,
    scheduled_for   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_pending ON notifications_outbox (scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_notif_user    ON notifications_outbox (user_id, created_at DESC);
