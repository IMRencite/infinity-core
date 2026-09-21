import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

function loadEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep);
    let val = trimmed.slice(sep + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const projectId = "prj_AVa1EK79vagoOB8PEtzWAQZTX0xI";
const knownDeployment = "dpl_5da3SmCapCDHfXPE5TkqPXbSYzHQ";
if (!token || !team) {
  console.error("missing vercel credentials");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${token}`, Accept: "application/stream+json" };
const qs = `teamId=${encodeURIComponent(team)}`;

async function getJson(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text.slice(0, 4000) };
    }
    return { status: res.status, json, bytes: text.length };
  } catch (error) {
    return { status: 0, json: { error: error instanceof Error ? error.name : "fetch_failed" }, bytes: 0 };
  } finally {
    clearTimeout(timer);
  }
}

async function readStream(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.body) return { status: res.status, lines: [], bytes: 0 };
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    const lines = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\n");
      buf = parts.pop() ?? "";
      for (const part of parts) {
        if (part.trim()) lines.push(part.slice(0, 2000));
      }
      if (lines.length >= 200) break;
    }
    if (buf.trim()) lines.push(buf.slice(0, 2000));
    return { status: res.status, lines, bytes: lines.join("\n").length };
  } catch (error) {
    return { status: 0, lines: [error instanceof Error ? error.name : "stream_failed"], bytes: 0 };
  } finally {
    clearTimeout(timer);
  }
}

const deployments = await getJson(
  `https://api.vercel.com/v6/deployments?${qs}&projectId=${projectId}&limit=8`,
);

const items = deployments.json?.deployments ?? [];
const latest = items[0] ?? null;
const deploymentIds = [...new Set([latest?.uid, knownDeployment, ...items.slice(0, 3).map((d) => d.uid)].filter(Boolean))];

const endpointResults = [];
for (const deploymentId of deploymentIds) {
  const stream = await readStream(
    `https://api.vercel.com/v1/projects/${projectId}/deployments/${deploymentId}/runtime-logs?${qs}`,
    18000,
  );
  const events = await getJson(
    `https://api.vercel.com/v3/deployments/${deploymentId}/events?${qs}&builds=1&direction=backward&limit=80`,
  );
  const inspect = await getJson(`https://api.vercel.com/v13/deployments/${deploymentId}?${qs}`);
  endpointResults.push({
    deploymentId,
    streamStatus: stream.status,
    streamLineCount: stream.lines.length,
    streamSample: stream.lines.slice(0, 30),
    errorLike: stream.lines.filter((line) => /error|fail|digest|1400196868|exception|dashboard/i.test(line)).slice(0, 40),
    eventsStatus: events.status,
    inspectState: inspect.json?.readyState ?? inspect.json?.error ?? null,
    inspectError: inspect.json?.errorMessage ?? inspect.json?.errorCode ?? null,
  });
}

const outDir = join(process.cwd(), ".infinity", "hq-production-deployment");
mkdirSync(outDir, { recursive: true });
const payload = {
  fetchedAt: new Date().toISOString(),
  deploymentsStatus: deployments.status,
  latestDeployments: items.slice(0, 5).map((d) => ({
    uid: d.uid,
    url: d.url,
    state: d.state,
    readyState: d.readyState,
    createdAt: d.createdAt,
    source: d.source,
  })),
  endpointResults,
};

writeFileSync(join(outDir, "runtime-log-probe.json"), JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));
