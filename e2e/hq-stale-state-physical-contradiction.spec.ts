import { expect, test, type Page } from "@playwright/test";
import { execSync, spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const HQ_LIVE_PROOF_COOKIE = "infinity-hq-live-proof";
const HQ_LIVE_PROOF_HEADER = "x-infinity-hq-live-proof";
const MISSION = "HQ_STALE_STATE_PHYSICAL_PROOF";
const ARTIFACT_DIR = join(process.cwd(), "e2e", "artifacts");
const CRE_VENTURE_ID = "candidate:7e7e924e-0741-4155-a729-8d529da77ea9";

type Diag = {
  sse: string | null;
  lastEventType: string | null;
  lastEventAt: string | null;
  lastSnapshotAt: string | null;
  version: string | null;
  mission: string | null;
  task: string | null;
  completed: string | null;
  active: string | null;
};

async function readDiag(page: Page): Promise<Diag> {
  const el = page.locator("[data-hq-live-diagnostics]").first();
  const attrs = await el.evaluate((node) => ({
    sse: node.getAttribute("data-hq-sse-state"),
    lastEventType: node.getAttribute("data-hq-last-event-type"),
    lastEventAt: node.getAttribute("data-hq-last-event-at"),
    lastSnapshotAt: node.getAttribute("data-hq-last-snapshot-at"),
    version: node.getAttribute("data-hq-canonical-version"),
  }));
  return {
    ...attrs,
    mission: await page.locator("[data-hq-activity-mission]").first().textContent().catch(() => null),
    task: await page.locator("[data-hq-activity-task]").first().textContent().catch(() => null),
    completed: await page.locator("[data-hq-activity-completed]").first().textContent().catch(() => null),
    active: await page.locator("[data-hq-activity-active]").first().textContent().catch(() => null),
  };
}

function runMission(phase: string, token?: string): string {
  return execSync(`npx tsx scripts/hq-stale-state-proof-mission.ts ${phase}${token ? ` ${token}` : ""}`, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
  }).trim();
}

function listeningPidOn3000(): string | null {
  const raw = execSync("netstat -ano", { encoding: "utf8" });
  const row = raw
    .split(/\r?\n/)
    .find((line) => /:3000\s/.test(line) && line.includes("LISTENING"));
  if (!row) return null;
  const parts = row.trim().split(/\s+/);
  return parts[parts.length - 1] ?? null;
}

function writeEvidence(evidence: Record<string, unknown>): void {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(join(ARTIFACT_DIR, "hq-stale-state-physical-contradiction.json"), JSON.stringify(evidence, null, 2));
}

async function waitForHqReady(timeoutMs = 90_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch("http://127.0.0.1:3000/dashboard", {
        headers: { [HQ_LIVE_PROOF_HEADER]: "1" },
      });
      if (res.ok) return;
    } catch {
      // still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error("HQ did not become ready after restart");
}

function restartHqServer(): void {
  const pid = listeningPidOn3000();
  if (pid) execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
  const child = spawn("npx", ["next", "dev", "--port", "3000"], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    shell: true,
    windowsHide: true,
  });
  child.unref();
}

async function setHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((isHidden) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (isHidden ? "hidden" : "visible"),
    });
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => isHidden,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    if (!isHidden) window.dispatchEvent(new Event("focus"));
  }, hidden);
}

test.use({ channel: "chrome" });

test("HQ live state physically updates without refresh", { timeout: 360_000 }, async ({ page, context, request }) => {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const evidence: Record<string, unknown> = { startedAt: new Date().toISOString() };

  await context.addCookies([
    { name: HQ_LIVE_PROOF_COOKIE, value: "1", url: "http://localhost:3000" },
  ]);
  await page.setExtraHTTPHeaders({ [HQ_LIVE_PROOF_HEADER]: "1" });

  const snapshotProbe = await request.get(
    `/api/operator-console/ventures/${encodeURIComponent(CRE_VENTURE_ID)}`,
    { headers: { [HQ_LIVE_PROOF_HEADER]: "1" } },
  );
  evidence.snapshotStatus = snapshotProbe.status();
  expect(snapshotProbe.ok()).toBeTruthy();

  const liveStateProbe = await request.get("/api/operator-console/hq-live-state", {
    headers: { [HQ_LIVE_PROOF_HEADER]: "1" },
  });
  evidence.liveStateStatus = liveStateProbe.status();
  expect(liveStateProbe.ok()).toBeTruthy();
  const liveState = await liveStateProbe.json();
  evidence.liveStateHasCommandActivity = Boolean(liveState?.commandActivity);
  expect(liveState.commandActivity).toBeTruthy();

  await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.locator("[data-hq-founder-route='/dashboard']")).toBeVisible({ timeout: 120_000 });
  await expect(page.locator("[data-hq-live-diagnostics]").first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("[data-hq-live-diagnostics]").first()).toHaveAttribute("data-hq-sse-state", "open", {
    timeout: 45_000,
  });
  const sseProbe = await page.evaluate(async (headerName) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    try {
      const res = await fetch("/api/operator-console/hq-events", {
        headers: { [headerName]: "1", Accept: "text/event-stream" },
        signal: controller.signal,
      });
      const reader = res.body?.getReader();
      const first = reader ? await reader.read() : { value: undefined };
      return {
        status: res.status,
        type: res.headers.get("content-type"),
        chunk: first.value ? new TextDecoder().decode(first.value).slice(0, 240) : "",
      };
    } catch (error) {
      return { status: 0, type: null, chunk: error instanceof Error ? error.message : String(error) };
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }, HQ_LIVE_PROOF_HEADER);
  evidence.sseProbe = sseProbe;
  expect(sseProbe.status).toBe(200);
  expect(String(sseProbe.type)).toContain("text/event-stream");
  expect(sseProbe.chunk).toMatch(/HQ_SNAPSHOT_INVALIDATED|HEARTBEAT|VENTURE_STATE_CHANGED/);

  const connected = await readDiag(page);
  evidence.connected = connected;
  expect(connected.sse).toBe("open");
  expect(connected.lastEventAt || connected.lastSnapshotAt).toBeTruthy();

  await expect
    .poll(async () => (await readDiag(page)).lastEventAt, { timeout: 25_000 })
    .not.toBe(connected.lastEventAt);
  const afterHeartbeat = await readDiag(page);
  evidence.eventAdvanced = {
    before: connected.lastEventAt,
    after: afterHeartbeat.lastEventAt,
    type: afterHeartbeat.lastEventType,
  };

  await expect
    .poll(async () => (await readDiag(page)).lastSnapshotAt, { timeout: 25_000 })
    .toBeTruthy();
  const afterSnapshot = await readDiag(page);
  evidence.snapshotAdvanced = {
    before: connected.lastSnapshotAt,
    after: afterSnapshot.lastSnapshotAt,
  };

  const startOut = runMission("start");
  evidence.startOut = startOut;
  await expect(page.locator("[data-hq-activity-mission]").first()).toContainText(MISSION, {
    timeout: 30_000,
  });
  await expect(page.locator("[data-hq-activity-task]").first()).toContainText(/live catch-up|without a manual refresh/i, {
    timeout: 15_000,
  });
  const afterStart = await readDiag(page);
  evidence.afterStart = afterStart;
  expect(afterStart.sse).toBe("open");

  const focusToken = `focus-${Date.now()}`;
  await setHidden(page, true);
  runMission("mark", focusToken);
  await page.waitForTimeout(1500);
  const whileHidden = await readDiag(page);
  evidence.whileHidden = { ...whileHidden, focusToken };
  await setHidden(page, false);
  await expect(page.locator("body")).toContainText(focusToken, { timeout: 20_000 });
  const afterFocus = await readDiag(page);
  evidence.afterFocus = afterFocus;

  const completeOut = runMission("complete");
  evidence.completeOut = completeOut;
  await expect(page.locator("[data-hq-activity-completed]").first()).toContainText(
    /HQ must show completion without a manual refresh|HQ stale-state physical proof completed|HQ_STALE_STATE_PHYSICAL_PROOF|HQ stale-state physical proof/,
    { timeout: 30_000 },
  );
  const afterComplete = await readDiag(page);
  evidence.afterComplete = afterComplete;
  writeEvidence(evidence);

  evidence.restartAt = new Date().toISOString();
  writeEvidence(evidence);
  restartHqServer();
  await waitForHqReady();
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("pageshow"));
    window.dispatchEvent(new Event("focus"));
  });
  await expect(page.locator("[data-hq-live-diagnostics]").first()).toHaveAttribute("data-hq-sse-state", "open", {
    timeout: 90_000,
  });
  await expect(page.locator("[data-hq-activity-completed]").first()).toContainText(
    /HQ must show completion without a manual refresh|HQ_STALE_STATE_PHYSICAL_PROOF|HQ stale-state physical proof/,
    { timeout: 30_000 },
  );
  const afterRestart = await readDiag(page);
  evidence.afterRestart = afterRestart;
  evidence.finishedAt = new Date().toISOString();
  writeEvidence(evidence);

  expect(afterRestart.sse).toBe("open");
  expect(afterRestart.lastEventAt).toBeTruthy();
  expect(afterRestart.lastSnapshotAt).toBeTruthy();
});
