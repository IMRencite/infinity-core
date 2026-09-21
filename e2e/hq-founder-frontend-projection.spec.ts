import { expect, test, type Page, type Response } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const HQ_FOUNDER_FRONTEND_PROJECTION_PROOF_MISSION = "HQ_FOUNDER_FRONTEND_PROJECTION_PROOF";

const ARTIFACT_DIR = join(process.cwd(), "e2e", "artifacts");
const FAVC1_PATH = "/api/operator-console/favc1-cycle";
const HARNESS = "/dev/hq-live-projection";

type PollRecord = {
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  activeCount: number;
  mission: string | null;
};

function screenshotPath(name: string): string {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  return join(ARTIFACT_DIR, name);
}

function activeCountLocator(page: Page) {
  return page.locator("[data-hq-activity-active]").first();
}

function roomPresence(page: Page, room: string) {
  return page.locator(`[data-hq-floor-room="${room}"] [data-hq-room-presence]`).first();
}

async function parseFavc1Response(response: Response): Promise<PollRecord | null> {
  if (!response.url().includes(FAVC1_PATH) || response.request().method() !== "GET") return null;
  const finishedAt = Date.now();
  let body: { snapshot?: { commandActivity?: { counts?: { activeMissions?: number }; nowInspecting?: { currentMission?: string | null } } } };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    return null;
  }
  const activity = body.snapshot?.commandActivity;
  return {
    startedAt: finishedAt - Math.round(response.request().timing().responseEnd || 0),
    finishedAt,
    durationMs: Math.round(response.request().timing().responseEnd || 0),
    activeCount: activity?.counts?.activeMissions ?? 0,
    mission: activity?.nowInspecting?.currentMission ?? null,
  };
}

async function waitForActiveProof(page: Page) {
  await expect(activeCountLocator(page)).not.toHaveText("0", { timeout: 60_000 });
  await expect(page.locator("[data-hq-activity-mission]").first()).toContainText(
    HQ_FOUNDER_FRONTEND_PROJECTION_PROOF_MISSION,
    { timeout: 15_000 },
  );
  await expect(page.locator("[data-hq-current-execution]").first()).toHaveAttribute(
    "data-hq-current-execution",
    HQ_FOUNDER_FRONTEND_PROJECTION_PROOF_MISSION,
  );
  await expect(page.locator("[data-hq-region='command'] [data-hq-room-presence]").first()).toHaveText("ACTIVE_WORK");
}

test("founder HQ frontend projects live Infinity execution without refresh", async ({ page, request }) => {
  const polls: PollRecord[] = [];
  page.on("response", (response) => {
    void parseFavc1Response(response).then((record) => {
      if (record) polls.push(record);
    });
  });

  await page.goto(HARNESS, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await expect(page.locator("[data-hq-live-projection-harness]")).toBeVisible();
  await expect(activeCountLocator(page)).toHaveText("0", { timeout: 45_000 });
  await page.screenshot({ path: screenshotPath("baseline-idle.png"), fullPage: true });

  const start = await request.post("/api/operator-console/dev/hq-frontend-projection-proof");
  expect(start.status()).toBe(202);
  const startBody = (await start.json()) as { providerWrites?: number };
  expect(startBody.providerWrites).toBe(0);

  await waitForActiveProof(page);
  const activeDuringMission = Number(await activeCountLocator(page).textContent());
  expect(activeDuringMission).toBeGreaterThanOrEqual(1);

  await expect(roomPresence(page, "systems_architect")).toHaveText("ACTIVE_WORK", { timeout: 20_000 });
  await expect(roomPresence(page, "launch_operations")).toHaveText(/PRESENT_IDLE|EMPTY/);
  await expect(page.locator("[data-hq-worker-role]").first()).toBeVisible();
  await expect(page.locator("[data-hq-worker-task]").first()).not.toHaveText("");
  await expect(page.locator("[data-hq-worker-glow='true']").first()).toBeVisible();
  await expect(page.locator("[data-hq-worker-motion='true']").first()).toBeVisible();
  await expect(page.locator(".hq-worker-orb--active-work").first()).toBeVisible();
  await page.screenshot({ path: screenshotPath("systems-architect-active.png"), fullPage: true });

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForActiveProof(page);
  await expect(page.locator("[data-hq-worker-role]").first()).toBeVisible();

  await expect(roomPresence(page, "product_lab")).toHaveText("ACTIVE_WORK", { timeout: 25_000 });
  await expect(page.locator("[data-hq-activity-mission]").first()).toContainText(
    HQ_FOUNDER_FRONTEND_PROJECTION_PROOF_MISSION,
  );
  await page.screenshot({ path: screenshotPath("creation-lab-active.png"), fullPage: true });

  await expect(roomPresence(page, "quality_control")).toHaveText("ACTIVE_WORK", { timeout: 25_000 });
  await expect(roomPresence(page, "launch_operations")).not.toHaveText("ACTIVE_WORK");
  await page.screenshot({ path: screenshotPath("validation-station-active.png"), fullPage: true });

  await expect(activeCountLocator(page)).toHaveText("0", { timeout: 40_000 });
  await expect(page.locator("[data-hq-region='command'] [data-hq-room-presence]").first()).not.toHaveText("ACTIVE_WORK");
  await expect(page.locator("[data-hq-activity-completed]").first()).toContainText(
    HQ_FOUNDER_FRONTEND_PROJECTION_PROOF_MISSION,
  );
  await expect(page.locator("[data-hq-worker-glow='true']")).toHaveCount(0);
  await page.screenshot({ path: screenshotPath("completed-idle.png"), fullPage: true });

  const proofPolls = polls.filter((poll) => poll.mission === HQ_FOUNDER_FRONTEND_PROJECTION_PROOF_MISSION);
  expect(polls.length).toBeGreaterThanOrEqual(3);
  expect(proofPolls.length).toBeGreaterThanOrEqual(1);
  const durations = polls.map((poll) => poll.durationMs).filter((ms) => ms > 0);
  const averageDuration = durations.reduce((sum, ms) => sum + ms, 0) / Math.max(durations.length, 1);
  const intervals = polls
    .slice(1)
    .map((poll, index) => poll.finishedAt - polls[index].finishedAt)
    .filter((ms) => ms > 0);
  const averageInterval = intervals.reduce((sum, ms) => sum + ms, 0) / Math.max(intervals.length, 1);
  console.log(
    JSON.stringify({
      browserPollRequests: polls.length,
      proofResponses: proofPolls.length,
      averageIntervalMs: Math.round(averageInterval),
      averageApiDurationMs: Math.round(averageDuration),
    }),
  );
});
