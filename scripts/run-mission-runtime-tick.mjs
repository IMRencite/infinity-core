#!/usr/bin/env node
/**
 * Durable host entry for runMissionRuntimeTick + acquisition tick.
 * Does not require a browser, Cursor session, or developer terminal after cron/CI starts it.
 *
 * Prefer Vercel cron GET /api/runtime/tick (vercel.json, every 12 hours).
 * This script is the same host for local/CI: POST the authenticated runtime tick route.
 */
const secret = process.env.CRON_SECRET || process.env.INFINITY_RUNTIME_TICK_SECRET || "";
const base = process.env.INFINITY_RUNTIME_TICK_URL || process.env.VERCEL_URL;
if (!base) {
  console.log(
    JSON.stringify({
      host: "runMissionRuntimeTick",
      message: "Set INFINITY_RUNTIME_TICK_URL or VERCEL_URL, or rely on Vercel cron /api/runtime/tick.",
      cadence: "0 */12 * * *",
      cursorRequired: false,
      browserRequired: false,
    }),
  );
  process.exit(0);
}
const url = `${base.replace(/\/$/, "")}/api/runtime/tick`;
const response = await fetch(url.startsWith("http") ? url : `https://${url}`, {
  method: "POST",
  headers: secret ? { authorization: `Bearer ${secret}` } : {},
});
const body = await response.text();
console.log(body);
if (!response.ok) process.exit(1);
