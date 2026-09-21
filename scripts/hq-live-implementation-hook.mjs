import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const WORK_ID = "work:infinity:hq-current-implementation";
const IGNORE = [
  "/.next/",
  "/.next-verify/",
  "/node_modules/",
  "/.git/",
  "/terminals/",
  "/agent-transcripts/",
  "/playwright-report/",
  "/test-results/",
  "executions.json",
  "current-session.json",
  "hq-live-tick.json",
  "last-hq-notify.json",
  "last-hook-payload.json",
];

function findCoreRoot() {
  const starts = [process.cwd(), SCRIPT_DIR, join(SCRIPT_DIR, "..")];
  for (const start of starts) {
    let dir = start;
    for (let i = 0; i < 8; i += 1) {
      if (existsSync(join(dir, "lib/infinity/canonical-work")) && existsSync(join(dir, "package.json"))) return dir;
      const nested = join(dir, "infinity-core");
      if (existsSync(join(nested, "lib/infinity/canonical-work"))) return nested;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

async function readStdin() {
  const chunks = [];
  try {
    for await (const chunk of process.stdin) {
      chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
    }
  } catch {
    return "";
  }
  return chunks.join("");
}

function parsePayload(raw) {
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function parseToolInput(payload) {
  const raw = payload.tool_input ?? payload.toolInput ?? payload.input ?? payload.arguments;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  return raw && typeof raw === "object" ? raw : null;
}

function extractTool(payload) {
  const candidates = [
    payload.tool_name,
    payload.toolName,
    payload.tool,
    payload.tool_input?.name,
    payload.tool_type,
    payload.hook_event_name,
  ];
  return candidates.find((value) => typeof value === "string" && value.trim()) ?? null;
}

function looksLikeSourcePath(value) {
  const normalized = String(value).replace(/\\/g, "/");
  return /\.(ts|tsx|js|jsx|mjs|cjs|json|md|css|svg)(\b|$)/i.test(normalized) && !normalized.includes("\n");
}

function extractFile(payload) {
  const input = parseToolInput(payload) ?? {};
  const candidates = [
    payload.file_path,
    payload.filePath,
    payload.path,
    input.file_path,
    input.filePath,
    input.path,
    input.target_notebook,
    payload.edits?.[0]?.file_path,
  ];
  const hit = candidates.find((value) => typeof value === "string" && value.trim());
  if (hit) return hit.trim();
  const found = [];
  walkStrings(payload, found);
  return found.find((row) => looksLikeSourcePath(row)) ?? null;
}

function extractCommand(payload) {
  const input = parseToolInput(payload) ?? {};
  const candidates = [payload.command, input.command, input.search_term, input.pattern];
  return candidates.find((value) => typeof value === "string" && value.trim()) ?? null;
}

function cleanLiveText(value) {
  return String(value).replace(/\\n/g, "\n").replace(/\s+/g, " ").trim();
}

function firstSentence(text, max = 110) {
  if (!text) return null;
  const line = cleanLiveText(text).replace(/^[#>*\-\d.]+\s*/, "").trim();
  if (line.length < 8) return null;
  const sentence = line.split(/(?<=[.!?])\s+/)[0] ?? line;
  return sentence.length > max ? `${sentence.slice(0, max - 3).trim()}...` : sentence;
}

function liveSentence({ file, tool, command, prompt, thought, previous }) {
  if (thought) return firstSentence(thought);
  const name = (file ?? "").replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? "";
  if (name) {
    if (/Read|Grep|Glob|beforeReadFile/i.test(tool ?? "")) return `Reading ${name}`;
    if (/Delete/i.test(tool ?? "")) return `Removing ${name}`;
    if (/Shell|beforeShellExecution|afterShellExecution/i.test(tool ?? "") && command) {
      return `Running ${firstSentence(command, 72)}`;
    }
    return `Editing ${name}`;
  }
  if (command) return `Running ${firstSentence(command, 80)}`;
  if (tool && !/pulse|prompt|complete|stop|afterAgentThought|AgentThought/i.test(tool)) return `Using ${tool}`;
  if (/^(Editing|Reading|Running|Removing|Using) /.test(previous ?? "")) return previous;
  if (prompt) return firstSentence(prompt);
  if (previous && previous !== "TASK DETAIL UNAVAILABLE") return previous;
  return null;
}

function isShortFollowUp(text) {
  if (!text) return true;
  const line = headline(text) ?? String(text).replace(/\s+/g, " ").trim();
  if (isInfinityMission(line)) return false;
  return line.length < 96 && !/\b(ensure|deploy|push live|qc gate|pill hover)\b/i.test(line);
}

function extractLatestUserQuery(contents) {
  const tagged = [...String(contents).matchAll(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/g)];
  const last = tagged.at(-1)?.[1]?.trim();
  if (last) return last;
  const lines = String(contents).split(/\r?\n/).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      const row = JSON.parse(lines[index]);
      if (row.role !== "user") continue;
      const content = row.message?.content;
      const text = Array.isArray(content)
        ? content.map((item) => item?.text ?? "").join("\n")
        : typeof content === "string" ? content : "";
      const query = text.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/)?.[1]?.trim();
      if (query) return query;
      if (text.trim().length >= 16) return text.trim();
    } catch {
      /* next */
    }
  }
  return null;
}

function listTranscriptFiles(dir) {
  if (!existsSync(dir)) return [];
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...listTranscriptFiles(full));
    else if (entry.name.endsWith(".jsonl")) found.push(full);
  }
  return found;
}

function latestUserObjective(root) {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  const roots = [
    process.env.CURSOR_TRANSCRIPT_DIR,
    join(home, ".cursor", "projects", "c-Users-Antivist-Desktop-Infinity", "agent-transcripts"),
    join(root, "..", ".cursor", "agent-transcripts"),
  ].filter(Boolean);
  const files = roots.flatMap((dir) => listTranscriptFiles(dir));
  const newest = files
    .map((path) => ({ path, mtime: existsSync(path) ? statSync(path).mtimeMs : 0 }))
    .sort((left, right) => right.mtime - left.mtime)[0];
  if (!newest) return null;
  try {
    const text = extractLatestUserQuery(readFileSync(newest.path, "utf8"));
    return text ? { text, mtime: newest.mtime } : null;
  } catch {
    return null;
  }
}

function shouldObserve(filePath) {
  if (!filePath) return true;
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  return !IGNORE.some((part) => normalized.includes(part.toLowerCase()));
}

const STALE_TITLES = new Set([
  "Infinity — HQ Live Current-Work Visibility",
  "HQ live current-work wiring",
  "Infinity implementation work",
]);

function headline(objective) {
  if (!objective) return null;
  const line = cleanLiveText(objective)
    .split(/\r?\n/)
    .map((row) => row.replace(/^#+\s*/, "").trim())
    .find((row) => row.length > 0 && !/^priority:|^do not |^stop\.$/i.test(row));
  if (!line) return null;
  const match = line.match(/^(INFINITY\s+[—-]\s+[^.\n]{8,96})/i);
  const raw = (match?.[1] ?? line).replace(/\s+/g, " ").trim();
  return raw.length > 96 ? `${raw.slice(0, 93).trim()}...` : raw;
}

function isInfinityMission(title) {
  return Boolean(title && /^INFINITY\s+[—-]\s+\S/i.test(title));
}

function keepStanding(title) {
  if (!title || STALE_TITLES.has(title)) return null;
  return title;
}

function walkStrings(value, found, depth = 0) {
  if (depth > 6 || found.length > 40 || value == null) return;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length >= 12) found.push(trimmed);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkStrings(item, found, depth + 1);
    return;
  }
  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (/prompt|text|content|message|input|objective|composer/i.test(key)) {
        walkStrings(item, found, depth + 1);
      }
    }
  }
}

function extractObjective(payload) {
  const direct = [payload.prompt, payload.prompt?.text, payload.user_query, payload.userQuery, payload.composer, payload.message?.text];
  const hit = direct.find((value) => typeof value === "string" && value.trim());
  if (hit) return hit.trim();
  const found = [];
  walkStrings(payload, found);
  const mission = found.find((row) => isInfinityMission(headline(row)));
  if (mission) return mission;
  return found
    .filter((row) => !looksLikeSourcePath(row) && row.length >= 16 && row.length <= 4000)
    .sort((left, right) => right.length - left.length)[0] ?? null;
}

function inferTitle(objective, file, sessionTitle, existingTitle) {
  const fromObjective = headline(objective);
  if (fromObjective && isInfinityMission(fromObjective)) return fromObjective;
  const standing = keepStanding(sessionTitle) ?? keepStanding(existingTitle);
  if (standing && isInfinityMission(standing) && isShortFollowUp(fromObjective)) return standing;
  if (fromObjective) return fromObjective;
  if (standing) return standing;
  if (!file) return standing ?? "Infinity implementation work";
  const path = file.replace(/\\/g, "/").toLowerCase();
  if (/financial-truth|treasury/.test(path)) return "Treasury / capital allocation";
  if (/canonical-work|current-implementation|implementation-observe|hq-live-implementation/.test(path)) {
    return standing ?? "Infinity implementation work";
  }
  if (/occupancynpv/.test(path)) return "OccupancyNPV";
  if (/operator-console|hq-/.test(path)) return "HQ operator console";
  return standing ?? "Infinity implementation work";
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeTick(root, event) {
  writeJson(join(root, ".infinity/canonical-work/hq-live-tick.json"), {
    event,
    at: new Date().toISOString(),
  });
}

function loadLocalEnv(root) {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep);
    let val = trimmed.slice(sep + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (process.env[key] == null) process.env[key] = val;
  }
}

async function upsertCloudRuntime(scope, instanceId, payload) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/cloud_runtime_state`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        scope,
        version: 1,
        instance_id: instanceId,
        payload,
        updated_at: payload.updated_at ?? payload.generated_at ?? new Date().toISOString(),
      }),
      signal: controller.signal,
    });
    return res.ok || res.status === 201 || res.status === 204;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function occupancyFromWork(work) {
  const active = work.status === "ACTIVE";
  const fill = (ids, on) => Object.fromEntries(ids.map((id) => [id, on && active ? "ACTIVE" : "IDLE"]));
  const departments = fill(
    ["OPERATIONS", "RESEARCH", "GROWTH", "VALIDATION", "SYSTEMS", "FINANCE", "PRODUCT", "CREATIVE", "PROSPECT_INTELLIGENCE"],
    true,
  );
  departments.RESEARCH = "IDLE";
  departments.GROWTH = "IDLE";
  departments.FINANCE = "IDLE";
  departments.PROSPECT_INTELLIGENCE = "IDLE";
  departments.CREATIVE = /creative|image|blog|brand/i.test(`${work.title} ${work.description}`) ? (active ? "ACTIVE" : "IDLE") : "IDLE";
  return {
    contract: "CanonicalPublicOccupancy",
    version: "occupancy-v1",
    generated_at: work.updated_at,
    summary: active ? "ACTIVE" : "IDLE",
    departments,
    sales_rooms: {
      OUTBOUND_ACQUISITION: "IDLE",
      INBOUND_CONVERSION: "IDLE",
      EXPANSION_RETENTION: "IDLE",
      PARTNERSHIPS_CHANNEL: "IDLE",
      OFFER_CLOSING: "IDLE",
    },
    agents: {
      "public-ops": active ? "ACTIVE" : "IDLE",
      "public-ops-2": active ? "ACTIVE" : "IDLE",
      "public-research": "IDLE",
      "public-growth": "IDLE",
      "public-growth-2": "IDLE",
      "public-validation": active ? "ACTIVE" : "IDLE",
      "public-systems": active ? "ACTIVE" : "IDLE",
      "public-finance": "IDLE",
      "public-product": active ? "ACTIVE" : "IDLE",
      "public-creative": departments.CREATIVE,
      "public-prospect-scout": "IDLE",
      "public-prospect-resolver": "IDLE",
      "public-sales-out": "IDLE",
      "public-sales-in": "IDLE",
      "public-sales-partner": "IDLE",
    },
  };
}

async function persistRemote(root, work) {
  loadLocalEnv(root);
  await upsertCloudRuntime("hq-current-implementation", "hq-live-implementation", work);
  await upsertCloudRuntime("public-operations-occupancy", "public-occupancy", occupancyFromWork(work));
}

async function notifyHq(root, force = false) {
  const stampPath = join(root, ".infinity/canonical-work/last-hq-notify.json");
  if (!force) {
    try {
      const previous = JSON.parse(readFileSync(stampPath, "utf8"));
      if (Date.now() - Date.parse(previous.at) < 400) return;
    } catch {
      /* first notify */
    }
  }
  writeJson(stampPath, { at: new Date().toISOString() });
  writeTick(root, "notify");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    await Promise.allSettled([
      fetch("http://127.0.0.1:3000/api/operator-console/hq-live-state", {
        headers: { "x-infinity-hq-live-proof": "1" },
        signal: controller.signal,
      }),
      fetch("https://hq.imros.io/api/operator-console/hq-live-state", {
        headers: { "x-infinity-hq-live-proof": "1" },
        signal: controller.signal,
      }),
    ]);
  } catch {
    /* HQ may not be running */
  } finally {
    clearTimeout(timer);
  }
}

async function pulse(root, payload, now) {
  const sessionPath = join(root, ".infinity/canonical-work/current-session.json");
  const storePath = join(root, ".infinity/canonical-work/executions.json");
  const file = extractFile(payload);
  if (file && !shouldObserve(file)) return;
  const session = readJson(sessionPath, {
    objective: null,
    mission_title: null,
    last_file: null,
    last_event: null,
    updated_at: now,
  });
  const store = readJson(storePath, { contract: "CanonicalWorkExecutionContract", executions: [] });
  const executions = Array.isArray(store.executions) ? store.executions : [];
  const existing = executions.find((row) => row.work_id === WORK_ID) ?? null;
  const thought = typeof payload.text === "string" && /afterAgentThought|AgentThought/i.test(String(payload.hook_event_name ?? payload.event ?? ""))
    ? payload.text
    : typeof payload.text === "string" && !payload.prompt && !extractFile(payload)
      ? payload.text
      : null;
  const fromPayload = extractObjective(payload);
  const transcript = fromPayload ? null : latestUserObjective(root);
  const sessionUpdated = Date.parse(session.updated_at);
  const sessionIsNewer = Number.isFinite(sessionUpdated) && transcript && sessionUpdated > transcript.mtime;
  const objective = fromPayload ?? (sessionIsNewer ? session.objective : transcript?.text) ?? session.objective;
  const tool = extractTool(payload);
  const command = extractCommand(payload);
  const title = inferTitle(objective, file, session.mission_title, existing?.title);
  const description = liveSentence({
    file,
    tool,
    command,
    prompt: objective,
    thought,
    previous: existing?.description ?? existing?.latest_output ?? session.objective,
  }) ?? existing?.description ?? "Working on the current founder request";
  writeJson(sessionPath, {
    objective,
    mission_title: title,
    last_file: file ?? session.last_file,
    last_event: "pulse",
    updated_at: now,
  });
  const next = {
    contract: "CanonicalWorkExecutionContract",
    work_id: WORK_ID,
    mission_id: "mission:infinity:hq-current-implementation",
    venture_id: null,
    work_type: "SYSTEM_ARCHITECTURE",
    title,
    description,
    stage: "SYSTEM_ARCHITECTURE / QC",
    status: "ACTIVE",
    assigned_rooms: ["operations", "systems_architect", "quality_control"],
    assigned_workers: ["Venture Operator", "Systems Architect", "Validation Station"],
    source: "EXTERNAL_IMPLEMENTATION_AGENT",
    started_at: existing?.started_at ?? now,
    updated_at: now,
    completed_at: null,
    blocked_reason: null,
    authorization_state: null,
    progress: description,
    latest_output: description,
    artifact_refs: [],
    evidence_refs: [],
    parent_work_id: existing?.parent_work_id ?? null,
    traceability_links: existing?.traceability_links ?? [WORK_ID],
    requires_infinity_worker_execution: false,
    classification: "SYSTEM_INFRASTRUCTURE",
    next_expected_transition: "WORK_COMPLETES_THEN_IDLE",
  };
  writeJson(storePath, {
    contract: "CanonicalWorkExecutionContract",
    executions: [...executions.filter((row) => row.work_id !== WORK_ID), next],
  });
  writeTick(root, "pulse");
  await persistRemote(root, next);
}

function rememberPrompt(root, payload, now) {
  const objective = extractObjective(payload);
  if (!objective) return;
  const sessionPath = join(root, ".infinity/canonical-work/current-session.json");
  const session = readJson(sessionPath, {
    objective: null,
    mission_title: null,
    last_file: null,
    last_event: null,
    updated_at: now,
  });
  const nextHeadline = headline(objective);
  writeJson(sessionPath, {
    ...session,
    objective,
    mission_title:
      nextHeadline && isInfinityMission(nextHeadline)
        ? nextHeadline
        : keepStanding(session.mission_title) ?? nextHeadline ?? session.mission_title,
    last_event: "prompt",
    updated_at: now,
  });
}

async function complete(root, now) {
  const sessionPath = join(root, ".infinity/canonical-work/current-session.json");
  const storePath = join(root, ".infinity/canonical-work/executions.json");
  const session = readJson(sessionPath, { objective: null, last_file: null, last_event: null, updated_at: now });
  writeJson(sessionPath, { ...session, last_event: "complete", updated_at: now });
  const store = readJson(storePath, { contract: "CanonicalWorkExecutionContract", executions: [] });
  const executions = Array.isArray(store.executions) ? store.executions : [];
  const existing = executions.find((row) => row.work_id === WORK_ID);
  if (!existing || existing.status !== "ACTIVE") return;
  writeJson(storePath, {
    contract: "CanonicalWorkExecutionContract",
    executions: executions.map((row) =>
      row.work_id === WORK_ID
        ? {
            ...row,
            status: "COMPLETED",
            latest_output: "Implementation turn ended · IDLE",
            updated_at: now,
            completed_at: now,
          }
        : row,
    ),
  });
  writeTick(root, "complete");
  await persistRemote(root, {
    ...existing,
    status: "COMPLETED",
    latest_output: "Implementation turn ended · IDLE",
    updated_at: now,
    completed_at: now,
  });
}

const raw = await readStdin();
const payload = parsePayload(raw);
const mode = process.argv[2] ?? payload.hook_event_name ?? payload.event ?? "pulse";
const root = findCoreRoot();
if (root) {
  const now = new Date().toISOString();
  try {
    writeJson(join(root, ".infinity/canonical-work/last-hook-payload.json"), {
      mode,
      at: now,
      keys: Object.keys(payload),
      tool: extractTool(payload),
      file: extractFile(payload),
      prompt: typeof payload.prompt === "string" ? payload.prompt.slice(0, 240) : null,
      text: typeof payload.text === "string" ? payload.text.slice(0, 240) : null,
    });
  } catch {
    /* ignore */
  }
  if (mode === "prompt") {
    rememberPrompt(root, payload, now);
    await pulse(root, { ...payload, hook_event_name: payload.hook_event_name ?? "beforeSubmitPrompt" }, now);
    await notifyHq(root, true);
  } else if (mode === "thought") {
    await pulse(root, { ...payload, hook_event_name: payload.hook_event_name ?? "afterAgentThought" }, now);
    await notifyHq(root);
  } else if (mode === "complete" || mode === "stop" || mode === "sessionEnd" || mode === "session_end") {
    await complete(root, now);
    await notifyHq(root, true);
  } else if (mode === "pulse-quiet") {
    await pulse(root, payload, now);
  } else {
    await pulse(root, payload, now);
    await notifyHq(root);
  }
}
process.stdout.write("{}\n");
