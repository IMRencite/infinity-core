#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "../lib/infinity/communication-provider/load-local-env.ts";
import { VERCEL_TOKEN_ENV, VERCEL_TEAM_ID_ENV } from "../lib/infinity/launch-gateway/provider-config.ts";

const id = process.argv[2];
if (!id) {
  console.error("usage: probe-vercel-deployment-error.mjs <deployment_id>");
  process.exit(1);
}
loadServerEnvFromLocalFile();
reloadVercelFromLocalFile();
const token = process.env[VERCEL_TOKEN_ENV]?.trim();
const team = process.env[VERCEL_TEAM_ID_ENV]?.trim();
const q = team ? `?teamId=${encodeURIComponent(team)}` : "";
const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
const dep = await fetch(`https://api.vercel.com/v13/deployments/${encodeURIComponent(id)}${q}`, { headers });
const depJson = await dep.json();
const events = await fetch(`https://api.vercel.com/v2/deployments/${encodeURIComponent(id)}/events${q}`, { headers });
const eventsJson = await events.json();
const out = { dep: depJson, events: Array.isArray(eventsJson) ? eventsJson.slice(-40) : eventsJson };
writeFileSync(".infinity/commerce/vercel-deployment-probe.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify({ readyState: depJson.readyState, errorMessage: depJson.errorMessage, eventCount: out.events?.length }, null, 2));
