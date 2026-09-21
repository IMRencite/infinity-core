import { expect, test, type Page, type Response } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MISSION = "HQ_CLIENT_STATE_COMMIT_E2E_PROOF";
const ARTIFACT_DIR = join(process.cwd(), "e2e", "artifacts");
const FAVC1_PATH = "/api/operator-console/favc1-cycle";
const HARNESS = "/dev/hq-live-projection";

type PollRow = {
  requestSequence: number;
  requestedAt: string;
  responseAt: string;
  httpDurationMs: number;
  responseActiveCount: number;
  responseMission: string | null;
  responseMissionId: string | null;
  accepted: boolean | null;
  committedActiveCount: number | null;
  domActiveCount: number | null;
};

function activeCountLocator(page: Page) {
  return page.locator("[data-hq-activity-active]").first();
}

async function parseFavc1(response: Response): Promise<Omit<PollRow, "accepted" | "committedActiveCount" | "domActiveCount" | "requestSequence"> | null> {
  if (!response.url().includes(FAVC1_PATH) || response.request().method() !== "GET") return null;
  const responseAt = new Date().toISOString();
  let body: {
    snapshot?: {
      commandActivity?: {
        counts?: { activeMissions?: number };
        nowInspecting?: { currentMission?: string | null };
        systemView?: { missionId?: string | null };
      };
    };
  };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    return null;
  }
  const activity = body.snapshot?.commandActivity;
  return {
    requestedAt: new Date(Date.now() - Math.max(0, Math.round(response.request().timing().responseEnd || 0))).toISOString(),
    responseAt,
    httpDurationMs: Math.round(response.request().timing().responseEnd || 0),
    responseActiveCount: activity?.counts?.activeMissions ?? 0,
    responseMission: activity?.nowInspecting?.currentMission ?? null,
    responseMissionId: activity?.systemView?.missionId ?? null,
  };
}

test("live HQ poll snapshots commit to React state and founder DOM", async ({ page, request }) => {
  const polls: PollRow[] = [];
  let sequence = 0;
  page.on("response", (response) => {
    void parseFavc1(response).then(async (partial) => {
      if (!partial) return;
      sequence += 1;
      const committed = Number(await page.locator("[data-hq-committed-active]").first().getAttribute("data-hq-committed-active").catch(() => "0"));
      const dom = Number((await activeCountLocator(page).textContent().catch(() => "0")) ?? "0");
      polls.push({
        requestSequence: sequence,
        ...partial,
        accepted: null,
        committedActiveCount: Number.isFinite(committed) ? committed : null,
        domActiveCount: Number.isFinite(dom) ? dom : null,
      });
    });
  });

  await page.goto(HARNESS, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await expect(page.locator("[data-hq-live-projection-harness]")).toBeVisible();
  await expect(activeCountLocator(page)).toHaveText("0", { timeout: 60_000 });

  const start = await request.post("/api/operator-console/dev/hq-client-state-commit-e2e");
  expect(start.status()).toBe(202);
  expect(((await start.json()) as { providerWrites?: number }).providerWrites).toBe(0);

  await expect(activeCountLocator(page)).not.toHaveText("0", { timeout: 90_000 });
  await expect(page.locator("[data-hq-committed-active]").first()).not.toHaveAttribute("data-hq-committed-active", "0");
  await expect(page.locator("[data-hq-activity-mission]").first()).toContainText(MISSION, { timeout: 20_000 });
  await expect(page.locator("[data-hq-floor-room='systems_architect'] [data-hq-room-presence]").first()).toHaveText(
    "ACTIVE_WORK",
    { timeout: 25_000 },
  );
  await expect(page.locator("[data-hq-worker-role]").first()).toBeVisible();
  await expect(page.locator("[data-hq-worker-task]").first()).not.toHaveText("");

  await expect(page.locator("[data-hq-floor-room='product_lab'] [data-hq-room-presence]").first()).toHaveText(
    "ACTIVE_WORK",
    { timeout: 25_000 },
  );
  await expect(page.locator("[data-hq-floor-room='quality_control'] [data-hq-room-presence]").first()).toHaveText(
    "ACTIVE_WORK",
    { timeout: 25_000 },
  );

  await expect(activeCountLocator(page)).toHaveText("0", { timeout: 50_000 });
  await expect(page.locator("[data-hq-activity-completed]").first()).toContainText(MISSION);

  const traces = await page.evaluate(() => {
    return (window as Window & { __INFINITY_HQ_SNAPSHOT_TRACE__?: Array<{ source: string; accepted: boolean; previousActiveCount: number; nextActiveCount: number }> })
      .__INFINITY_HQ_SNAPSHOT_TRACE__ ?? [];
  });
  const acceptedLive = traces.find((row) => row.accepted && row.previousActiveCount === 0 && row.nextActiveCount >= 1);
  expect(acceptedLive).toBeTruthy();

  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(
    join(ARTIFACT_DIR, "hq-client-state-commit-polls.json"),
    JSON.stringify({ polls, traces, mission: MISSION }, null, 2),
  );

  const liveHttp = polls.filter((poll) => poll.responseActiveCount >= 1 && poll.responseMission === MISSION);
  expect(liveHttp.length).toBeGreaterThanOrEqual(1);
  expect(polls.some((poll) => poll.domActiveCount !== null && poll.domActiveCount >= 1)).toBe(true);
});
