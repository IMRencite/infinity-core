/**
 * Operator recovery steps for PostgREST PGRST002 blocking membership queries.
 * Run: node scripts/postgrest-recovery-guide.mjs
 */
console.log(`
PostgREST PGRST002 — membership queries blocked

Evidence:
- Auth works; onboarding reachable
- Direct SQL works (organization_members exists; migrations applied)
- PostgREST /rest/v1/* returns 503 PGRST002 for all tables

Recovery (choose one path):

1) Supabase Dashboard
   - Settings → API → Data API → Enable Data API
   - Settings → API → Exposed schemas: public, graphql_public only
   - Integrations → Data API → Hardening: remove stale exposed schemas
   - Restart API / project if offered

2) Supported CLI sync (from repo root)
   npx supabase config push --yes

3) SQL Editor (if dashboard schemas are stale)
   ALTER ROLE authenticator SET pgrst.db_schemas = 'public,graphql_public';
   NOTIFY pgrst, 'reload config';

Verify:
   node scripts/probe-postgrest-membership.mjs
   node scripts/diagnose-membership-query.mjs

Expected after recovery:
- HTTP 200/401 (not 503) from /rest/v1/organization_members
- Operator with existing membership → /dashboard
- Operator without membership → /dashboard/onboarding form
`);
