import { expect, test, type Page, type Response } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const HQ_LIVE_PROOF_COOKIE = "infinity-hq-live-proof";
const HQ_LIVE_PROOF_HEADER = "x-infinity-hq-live-proof";

const MISSION = "HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF";
const ARTIFACT_DIR = join(process.cwd(), "e2e", "artifacts");
const DASHBOARD = "/dashboard";

type PollRow = {
  requestSequence: number;
  requestedAt: string;
  responseAt: string;
  httpDurationMs: number;
  endpoint: string;
  responseActiveCount: number;
  responseMission: string | null;
  accepted: boolean | null;
  committedActiveCount: number | null;
  domActiveCount: number | null;
  roomDom: string | null;
  workerDom: string | null;
};

function activeCountLocator(page: Page) {
  return page.locator("[data-hq-activity-active]").first();
}

function isHqPoll(url: string): boolean {
  return url.includes("/api/operator-console/favc1-cycle") || url.includes("/api/operator-console/ventures/");
}

async function parseHqPoll(response: Response): Promise<Omit<PollRow, "accepted" | "committedActiveCount" | "domActiveCount" | "requestSequence" | "roomDom" | "workerDom"> | null> {
  if (!isHqPoll(response.url()) || response.request().method() !== "GET") return null;
  const responseAt = new Date().toISOString();
  let body: {
    snapshot?: {
      commandActivity?: {
        counts?: { activeMissions?: number };
        nowInspecting?: { currentMission?: string | null };
      };
    };
    commandActivity?: {
      counts?: { activeMissions?: number };
      nowInspecting?: { currentMission?: string | null };
    };
  };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    return null;
  }
  const activity = body.snapshot?.commandActivity ?? body.commandActivity;
  return {
    requestedAt: new Date(Date.now() - Math.max(0, Math.round(response.request().timing().responseEnd || 0))).toISOString(),
    responseAt,
    httpDurationMs: Math.round(response.request().timing().responseEnd || 0),
    endpoint: new URL(response.url()).pathname,
    responseActiveCount: activity?.counts?.activeMissions ?? 0,
    responseMission: activity?.nowInspecting?.currentMission ?? null,
  };
}

async function captureDom(page: Page) {
  const committed = Number(await page.locator("[data-hq-committed-active]").first().getAttribute("data-hq-committed-active").catch(() => "0"));
  const dom = Number((await activeCountLocator(page).textContent().catch(() => "0")) ?? "0");
  const roomDom = await page.locator("[data-hq-floor-room] [data-hq-room-presence]").first().textContent().catch(() => null);
  const workerDom = await page.locator("[data-hq-worker-role]").first().textContent().catch(() => null);
  return {
    committedActiveCount: Number.isFinite(committed) ? committed : null,
    domActiveCount: Number.isFinite(dom) ? dom : null,
    roomDom,
    workerDom,
  };
}

test("actual founder /dashboard visibly tracks live Infinity execution", { timeout: 300_000 }, async ({ page, request, context }) => {
  await context.addCookies([
    {
      name: HQ_LIVE_PROOF_COOKIE,
      value: "1",
      url: "http://localhost:3000",
    },
  ]);
  await page.setExtraHTTPHeaders({ [HQ_LIVE_PROOF_HEADER]: "1" });

  const polls: PollRow[] = [];
  let sequence = 0;
  page.on("response", (response) => {
    void parseHqPoll(response).then(async (partial) => {
      if (!partial) return;
      sequence += 1;
      const dom = await captureDom(page);
      polls.push({
        requestSequence: sequence,
        ...partial,
        accepted: null,
        ...dom,
      });
    });
  });

  await page.goto(DASHBOARD, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.locator("[data-hq-founder-route='/dashboard']")).toBeVisible({ timeout: 120_000 });
  await expect(page.locator("[data-hq-live-projection-harness]")).toHaveCount(0);
  await expect(page).not.toHaveURL(/\/dev\/hq-live-projection/);
  await expect(activeCountLocator(page)).toHaveText("0", { timeout: 90_000 });
  await expect(page.locator("[data-hq-region='command'] [data-hq-room-presence]").first()).toHaveText(/PRESENT_IDLE|IDLE|ACTIVE_WORK/, { timeout: 20_000 });

  const start = await request.post("/api/operator-console/dev/hq-real-dashboard-live-execution");
  expect(start.status()).toBe(202);
  expect(((await start.json()) as { providerWrites?: number }).providerWrites).toBe(0);

  await expect(activeCountLocator(page)).not.toHaveText("0", { timeout: 90_000 });
  await expect(page.locator("[data-hq-committed-active]").first()).not.toHaveAttribute("data-hq-committed-active", "0");
  await expect(page.locator("[data-hq-activity-mission]").first()).toContainText(MISSION, { timeout: 20_000 });
  await expect(page.locator("[data-hq-region='command'] [data-hq-room-presence]").first()).toHaveText("ACTIVE_WORK");
  await expect(page.locator("[data-hq-floor-room='systems_architect'] [data-hq-room-presence]").first()).toHaveText("ACTIVE_WORK", { timeout: 25_000 });
  await expect(page.locator("[data-hq-worker-role]").first()).toBeVisible();
  await expect(page.locator("[data-hq-worker-task]").first()).not.toHaveText("");
  await expect(page.locator(".hq-worker-orb--motion, .hq-orb-pulse").first()).toBeVisible();
  await expect(page.locator(".hq-room-title-active").first()).toBeVisible();
  await expect(page.locator("[data-hq-floor-room='launch_operations'] [data-hq-room-presence]").first()).not.toHaveText("ACTIVE_WORK");
  await expect(page.locator("[data-hq-floor-room='launch_operations'] [data-hq-room-presence]").first()).toHaveText(/EMPTY|PRESENT_IDLE|IDLE/);

  await expect(page.locator("[data-hq-floor-room='product_lab'] [data-hq-room-presence]").first()).toHaveText("ACTIVE_WORK", { timeout: 50_000 });
  await expect(page.locator("[data-hq-floor-room='quality_control'] [data-hq-room-presence]").first()).toHaveText("ACTIVE_WORK", { timeout: 50_000 });

  await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.locator("[data-hq-founder-route='/dashboard']")).toBeVisible({ timeout: 120_000 });
  await expect(activeCountLocator(page)).not.toHaveText("0", { timeout: 90_000 });
  await expect(page.locator("[data-hq-activity-mission]").first()).toContainText(MISSION, { timeout: 20_000 });

  await expect(activeCountLocator(page)).toHaveText("0", { timeout: 60_000 });
  await expect(page.locator("[data-hq-activity-completed]").first()).toContainText(MISSION);

  await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.locator("[data-hq-founder-route='/dashboard']")).toBeVisible({ timeout: 120_000 });
  await expect(activeCountLocator(page)).toHaveText("0", { timeout: 90_000 });
  await expect(page.locator("[data-hq-activity-completed]").first()).toContainText(MISSION);

  const traces = await page.evaluate(() => {
    return (
      (window as Window & { __INFINITY_HQ_SNAPSHOT_TRACE__?: Array<{ source: string; accepted: boolean; previousActiveCount: number; nextActiveCount: number }> })
        .__INFINITY_HQ_SNAPSHOT_TRACE__ ?? []
    );
  });

  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(
    join(ARTIFACT_DIR, "hq-real-dashboard-live-execution-polls.json"),
    JSON.stringify({ polls, traces, mission: MISSION, url: page.url() }, null, 2),
  );

  const liveHttp = polls.filter((poll) => poll.responseActiveCount >= 1 && poll.responseMission === MISSION);
  expect(liveHttp.length).toBeGreaterThanOrEqual(1);
  expect(polls.some((poll) => poll.domActiveCount !== null && poll.domActiveCount >= 1)).toBe(true);
  expect(page.url()).toContain("/dashboard");
  expect(page.url()).not.toContain("/dev/hq-live-projection");
});
