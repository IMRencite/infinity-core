-- Read-only diagnostics for SQLSTATE 57014 investigation
SELECT current_setting('statement_timeout') AS session_timeout;

SELECT name, setting, source
FROM pg_settings
WHERE name IN ('statement_timeout', 'lock_timeout', 'idle_in_transaction_session_timeout');

SELECT rolname, rolconfig
FROM pg_roles
WHERE rolname IN ('authenticator', 'service_role', 'postgres', 'supabase_admin');

SELECT 'opportunity_discovery_runs' AS table_name, COUNT(*)::int AS total
FROM opportunity_discovery_runs
UNION ALL
SELECT 'opportunity_candidates', COUNT(*)::int FROM opportunity_candidates
UNION ALL
SELECT 'opportunity_candidate_evidence', COUNT(*)::int FROM opportunity_candidate_evidence
UNION ALL
SELECT 'research_runs', COUNT(*)::int FROM research_runs;

EXPLAIN (FORMAT TEXT)
SELECT id FROM organizations LIMIT 1;

EXPLAIN (FORMAT TEXT)
SELECT id FROM opportunity_discovery_runs
WHERE organization_id = '8ba4459b-e5f5-4ca3-86db-fbe6bbd51494'
LIMIT 1;

SELECT COUNT(*)::int AS waiting_locks FROM pg_locks WHERE NOT granted;
