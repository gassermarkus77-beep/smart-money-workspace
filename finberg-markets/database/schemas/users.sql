-- ============================================================================
-- FINBERG MARKETS — Users & Auth Schema
-- Target: PostgreSQL 16+
-- Covers: users, sessions, OAuth, 2FA, RBAC, API keys
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ----------------------------------------------------------------------------
-- USERS
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           CITEXT          NOT NULL UNIQUE,
    email_verified  BOOLEAN         NOT NULL DEFAULT FALSE,
    password_hash   TEXT,                                       -- Argon2id; NULL for OAuth-only
    username        CITEXT          UNIQUE,
    display_name    TEXT,
    avatar_url      TEXT,
    bio             TEXT,
    country         CHAR(2),                                    -- ISO-3166 alpha-2
    timezone        TEXT            DEFAULT 'UTC',
    locale          TEXT            DEFAULT 'en-US',
    role            TEXT            NOT NULL DEFAULT 'free'
                                    CHECK (role IN ('guest','free','pro','premium','institutional','admin')),
    status          TEXT            NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('active','suspended','banned','deleted')),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    last_login_at   TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_users_role        ON users (role) WHERE status = 'active';
CREATE INDEX idx_users_created_at  ON users (created_at DESC);

-- ----------------------------------------------------------------------------
-- OAUTH IDENTITIES
-- ----------------------------------------------------------------------------
CREATE TABLE oauth_identities (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider        TEXT            NOT NULL CHECK (provider IN ('google','apple','github','microsoft','linkedin')),
    provider_user_id TEXT           NOT NULL,
    email           CITEXT,
    raw_profile     JSONB,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_oauth_user ON oauth_identities (user_id);

-- ----------------------------------------------------------------------------
-- TWO-FACTOR AUTH
-- ----------------------------------------------------------------------------
CREATE TABLE user_mfa (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method          TEXT            NOT NULL CHECK (method IN ('totp','webauthn','sms')),
    secret_encrypted BYTEA,                                     -- TOTP shared secret (KMS-wrapped)
    webauthn_credential JSONB,                                  -- WebAuthn credential descriptor
    backup_codes_hash TEXT[],                                   -- Argon2id hashes
    name            TEXT,                                        -- user label e.g. "iPhone 15"
    enabled         BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    last_used_at    TIMESTAMPTZ
);

CREATE INDEX idx_user_mfa_user ON user_mfa (user_id) WHERE enabled;

-- ----------------------------------------------------------------------------
-- SESSIONS / REFRESH TOKENS
-- ----------------------------------------------------------------------------
CREATE TABLE sessions (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT         NOT NULL UNIQUE,           -- SHA-256 of opaque refresh
    user_agent      TEXT,
    ip_address      INET,
    device_fingerprint TEXT,
    issued_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ     NOT NULL,
    revoked_at      TIMESTAMPTZ,
    rotated_from    UUID            REFERENCES sessions(id)    -- token rotation chain
);

CREATE INDEX idx_sessions_user_active ON sessions (user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_sessions_expires     ON sessions (expires_at) WHERE revoked_at IS NULL;

-- ----------------------------------------------------------------------------
-- API KEYS (for institutional)
-- ----------------------------------------------------------------------------
CREATE TABLE api_keys (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_prefix      VARCHAR(12)     NOT NULL UNIQUE,            -- shown to user e.g. "fbk_live_..."
    key_hash        TEXT            NOT NULL UNIQUE,            -- Argon2id hash of full key
    name            TEXT            NOT NULL,
    scopes          TEXT[]          NOT NULL DEFAULT '{}',
    rate_limit_rpm  INTEGER         NOT NULL DEFAULT 600,
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    revoked_at      TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_user ON api_keys (user_id) WHERE revoked_at IS NULL;

-- ----------------------------------------------------------------------------
-- ORGANIZATIONS (institutional tier)
-- ----------------------------------------------------------------------------
CREATE TABLE organizations (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT            NOT NULL,
    slug            TEXT            NOT NULL UNIQUE,
    plan            TEXT            NOT NULL DEFAULT 'institutional',
    seats_purchased INTEGER         NOT NULL DEFAULT 5,
    sso_provider    TEXT,                                       -- saml | oidc
    sso_metadata    JSONB,
    billing_email   CITEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE organization_members (
    organization_id UUID            NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            TEXT            NOT NULL CHECK (role IN ('owner','admin','member')),
    joined_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX idx_org_members_user ON organization_members (user_id);

-- ----------------------------------------------------------------------------
-- AUDIT LOG (PII-light pointer; full content in ClickHouse)
-- ----------------------------------------------------------------------------
CREATE TABLE audit_events (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID            REFERENCES organizations(id) ON DELETE SET NULL,
    action          TEXT            NOT NULL,                   -- e.g. 'login.success'
    resource_type   TEXT,
    resource_id     TEXT,
    ip_address      INET,
    user_agent      TEXT,
    metadata        JSONB,
    occurred_at     TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user        ON audit_events (user_id, occurred_at DESC);
CREATE INDEX idx_audit_action      ON audit_events (action, occurred_at DESC);
CREATE INDEX idx_audit_occurred_at ON audit_events (occurred_at DESC);

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_orgs_updated
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
