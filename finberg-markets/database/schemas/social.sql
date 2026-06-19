-- ============================================================================
-- FINBERG MARKETS — Social Network Schema
-- Target: PostgreSQL 16+
-- ============================================================================

-- ----------------------------------------------------------------------------
-- POSTS / IDEAS
-- ----------------------------------------------------------------------------
CREATE TABLE posts (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id       UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind            TEXT            NOT NULL CHECK (kind IN ('idea','note','question')),
    title           TEXT,
    body_markdown   TEXT            NOT NULL,
    body_html       TEXT,                                       -- rendered & sanitized
    chart_snapshot_url TEXT,                                    -- S3 URL
    chart_layout_id UUID            REFERENCES chart_layouts(id) ON DELETE SET NULL,

    -- Idea-specific structured fields
    instrument_id   UUID,
    bias            TEXT            CHECK (bias IS NULL OR bias IN ('long','short','neutral')),
    timeframe       TEXT,
    entry_price     NUMERIC(20,10),
    target_price    NUMERIC(20,10),
    stop_price      NUMERIC(20,10),

    visibility      TEXT            NOT NULL DEFAULT 'public'
                                    CHECK (visibility IN ('public','followers','private')),
    status          TEXT            NOT NULL DEFAULT 'open'
                                    CHECK (status IN ('open','closed_win','closed_loss','expired','cancelled')),
    closed_at       TIMESTAMPTZ,
    realized_r      NUMERIC(8,4),                               -- R-multiple at close

    tags            TEXT[]          NOT NULL DEFAULT '{}',
    likes_count     INTEGER         NOT NULL DEFAULT 0,
    comments_count  INTEGER         NOT NULL DEFAULT 0,
    views_count     INTEGER         NOT NULL DEFAULT 0,

    moderation_status TEXT          NOT NULL DEFAULT 'approved'
                                    CHECK (moderation_status IN ('pending','approved','rejected','removed')),

    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_author       ON posts (author_id, created_at DESC);
CREATE INDEX idx_posts_instrument   ON posts (instrument_id, created_at DESC) WHERE moderation_status = 'approved';
CREATE INDEX idx_posts_public       ON posts (created_at DESC) WHERE visibility = 'public' AND moderation_status = 'approved';
CREATE INDEX idx_posts_tags         ON posts USING gin (tags);

-- ----------------------------------------------------------------------------
-- COMMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE comments (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id         UUID            NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    parent_id       UUID            REFERENCES comments(id) ON DELETE CASCADE,
    author_id       UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body_markdown   TEXT            NOT NULL,
    body_html       TEXT,
    likes_count     INTEGER         NOT NULL DEFAULT 0,
    moderation_status TEXT          NOT NULL DEFAULT 'approved',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_comments_post   ON comments (post_id, created_at);
CREATE INDEX idx_comments_author ON comments (author_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- LIKES / REACTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE reactions (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_type    TEXT            NOT NULL CHECK (subject_type IN ('post','comment')),
    subject_id      UUID            NOT NULL,
    kind            TEXT            NOT NULL DEFAULT 'like'
                                    CHECK (kind IN ('like','agree','disagree','insightful')),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (user_id, subject_type, subject_id, kind)
);

CREATE INDEX idx_reactions_subject ON reactions (subject_type, subject_id);

-- ----------------------------------------------------------------------------
-- FOLLOWS
-- ----------------------------------------------------------------------------
CREATE TABLE follows (
    follower_id     UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id     UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, followee_id),
    CHECK (follower_id <> followee_id)
);

CREATE INDEX idx_follows_followee ON follows (followee_id);

-- ----------------------------------------------------------------------------
-- DIRECT MESSAGES
-- ----------------------------------------------------------------------------
CREATE TABLE dm_threads (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    last_message_at TIMESTAMPTZ
);

CREATE TABLE dm_participants (
    thread_id       UUID            NOT NULL REFERENCES dm_threads(id) ON DELETE CASCADE,
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_at    TIMESTAMPTZ,
    PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE dm_messages (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id       UUID            NOT NULL REFERENCES dm_threads(id) ON DELETE CASCADE,
    sender_id       UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body_cipher     BYTEA,                                      -- E2EE ciphertext (if E2EE enabled)
    body_plain      TEXT,                                       -- only for non-E2EE
    attachments     JSONB,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    edited_at       TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_dm_thread_recent ON dm_messages (thread_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- REPUTATION (denormalized rollup, refreshed nightly)
-- ----------------------------------------------------------------------------
CREATE TABLE user_reputation (
    user_id         UUID            PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    ideas_published INTEGER         NOT NULL DEFAULT 0,
    ideas_won       INTEGER         NOT NULL DEFAULT 0,
    ideas_lost      INTEGER         NOT NULL DEFAULT 0,
    avg_r           NUMERIC(8,4),
    followers_count INTEGER         NOT NULL DEFAULT 0,
    reputation_score NUMERIC(8,2)   NOT NULL DEFAULT 0,         -- composite
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
