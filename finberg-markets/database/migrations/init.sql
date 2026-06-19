-- ============================================================================
-- FINBERG MARKETS — Initial Migration (combines all OLTP schemas)
-- Idempotent — safe to re-run.
-- ============================================================================

\i /docker-entrypoint-initdb.d/02-users.sql
\i /docker-entrypoint-initdb.d/03-charts_indicators.sql
\i /docker-entrypoint-initdb.d/04-alerts.sql
\i /docker-entrypoint-initdb.d/05-social.sql
\i /docker-entrypoint-initdb.d/06-billing.sql
