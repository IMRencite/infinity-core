#!/usr/bin/env node
/**
 * Bounded mission runtime tick entrypoint.
 * Prefer server action runMissionRuntimeTickAction or import runMissionRuntimeTick in CI/cron.
 *
 * Example (after build): use service role env and call from a server job runner.
 */
console.log(
  JSON.stringify({
    message:
      "Use runMissionRuntimeTick from lib/infinity/mission-runtime in a server context, or /dashboard/runtime dev control.",
  }),
);
