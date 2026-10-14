#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  process.env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
}

const secret = process.env.CRON_SECRET || process.env.INFINITY_RUNTIME_TICK_SECRET;
const res = await fetch("https://infinity-runtime.vercel.app/api/runtime/opportunity-discovery-tick?mode=health", {
  headers: { authorization: `Bearer ${secret}` },
});
const text = await res.text();
console.log("status", res.status);
console.log(text.slice(0, 2000));
