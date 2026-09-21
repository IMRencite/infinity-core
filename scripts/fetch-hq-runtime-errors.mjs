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
const deploymentId = "dpl_5da3SmCapCDHfXPE5TkqPXbSYzHQ";
if (!token || !team) {
  console.error("missing vercel credentials");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
const now = Date.now();
const since = now - 12 * 60 * 60 * 1000;

async function getJson(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text.slice(0, 6000) };
    }
    return { status: res.status, json, bytes: text.length };
  } catch (error) {
    return { status: 0, json: { error: error instanceof Error ? error.message : "fetch_failed" }, bytes: 0 };
  } finally {
    clearTimeout(timer);
  }
}

async function readStream(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const lines = [];
  try {
    const res = await fetch(url, {
      headers: { ...headers, Accept: "application/stream+json" },
      signal: controller.signal,
    });
    if (!res.body) return { status: res.status, lines, note: "no_body" };
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\n");
      buf = parts.pop() ?? "";
      for (const part of parts) {
        if (part.trim()) lines.push(part.slice(0, 3000));
      }
      if (lines.length >= 250) break;
    }
    if (buf.trim()) lines.push(buf.slice(0, 3000));
    return { status: res.status, lines, note: "ok" };
  } catch (error) {
    return { status: 0, lines, note: error instanceof Error ? error.name : "stream_failed" };
  } finally {
    clearTimeout(timer);
  }
}

const qs = `teamId=${encodeURIComponent(team)}`;
const attempts = [];

const eventUrls = [
  `https://api.vercel.com/v3/deployments/${deploymentId}/events?${qs}&direction=backward&limit=200&since=${since}`,
  `https://api.vercel.com/v3/deployments/${deploymentId}/events?${qs}&direction=backward&limit=200`,
  `https://api.vercel.com/v3/deployments/hq.imros.io/events?${qs}&direction=backward&limit=200&since=${since}`,
  `https://api.vercel.com/v2/deployments/${deploymentId}/events?${qs}&direction=backward&limit=200&since=${since}`,
];

for (const url of eventUrls) {
  const out = await getJson(url);
  const rows = Array.isArray(out.json) ? out.json : out.json?.events || out.json?.data || [];
  const texts = rows.map((row) => {
    const text = String(row.text || row.payload?.text || row.payload?.info || row.message || "");
    return {
      type: row.type || row.payload?.type || null,
      created: row.created || row.date || row.payload?.date || null,
      text: text.slice(0, 800),
      info: row.info || row.payload?.info || null,
    };
  });
  attempts.push({
    kind: "events",
    url,
    status: out.status,
    count: texts.length,
    interesting: texts.filter((row) => /error|fail|digest|1400196868|exception|ENOENT|EACCES|EROFS|dashboard|TypeError|ReferenceError/i.test(row.text)).slice(0, 50),
    sample: texts.slice(0, 8),
  });
}

const logUrls = [
  `https://api.vercel.com/v1/projects/${projectId}/deployments/${deploymentId}/runtime-logs?${qs}&since=${since}&until=${now}&source=serverless`,
  `https://api.vercel.com/v1/projects/${projectId}/deployments/${deploymentId}/runtime-logs?${qs}&startDate=${since}&endDate=${now}`,
  `https://api.vercel.com/v1/projects/${projectId}/deployments/${deploymentId}/runtime-logs?${qs}&level=error`,
];

for (const url of logUrls) {
  const stream = await readStream(url, 10000);
  attempts.push({
    kind: "runtime-logs",
    url,
    status: stream.status,
    note: stream.note,
    count: stream.lines.length,
    interesting: stream.lines.filter((line) => /error|fail|digest|1400196868|exception|dashboard|ENOENT|EROFS/i.test(line)).slice(0, 40),
    sample: stream.lines.slice(0, 8),
  });
}

const outDir = join(process.cwd(), ".infinity", "hq-production-deployment");
mkdirSync(outDir, { recursive: true });
const payload = { fetchedAt: new Date().toISOString(), since, now, attempts };
writeFileSync(join(outDir, "runtime-error-probe.json"), JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));
