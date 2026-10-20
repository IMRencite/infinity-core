#!/usr/bin/env node
/**
 * Retired: direct Vercel promote/alias bypasses canonical CT production deploy QC.
 * Use: npx tsx scripts/club-throttle-production-deploy.ts
 */
console.error(
  JSON.stringify({
    ok: false,
    reason: "CT_STANDALONE_PROMOTION_RETIRED",
    canonical_path: "scripts/club-throttle-production-deploy.ts",
    message: "Direct promote/alias without predeploy QC is forbidden.",
  }),
);
process.exit(1);
