import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, type Page } from "@playwright/test";
import {
  completeObservedImplementationWork,
  pulseCurrentImplementationWork,
} from "../lib/infinity/canonical-work/implementation-observe";

const ORIGIN = "http://localhost:3000";
const DASHBOARD = `${ORIGIN}/dashboard`;
const OUT_DIR = ".qc-runtime";

type HqProofCollect = {
  href: string;
  origin: string;
  title: string;
  authenticated: boolean;
  loginVisible: boolean;
  founderEmailVisible: boolean;
  sse: string;
  commandHeadline: string;
  commandActive: string;
  commandPresence: string;
  commandOversight: string;
  currentWorkId: string;
  currentMission: string;
  currentTask: string;
  latestVentureWork: string;
  latestVentureWorkId: string;
  latestVentureWorkText: string;
  floorCurrentWork: string;
  cursor: string;
  cursorAttr: string;
  connector: string;
  activeRuns: string;
  activeRunsAttr: string;
  operations: string;
  systemsArchitect: string;
  validationStation: string;
  commandActiveRooms: string;
  pulseCash: string;
  pulseAuthorized: string;
  pulseAllocated: string;
};

async function collect(page: Page): Promise<HqProofCollect> {
  return page.evaluate(`(() => {
    const text = (sel) => {
      const el = document.querySelector(sel);
      return el && el.textContent ? el.textContent.replace(/\\s+/g, " ").trim() : "";
    };
    const attr = (sel, name) => {
      const el = document.querySelector(sel);
      return el ? el.getAttribute(name) || "" : "";
    };
    const room = (id) =>
      attr("[data-hq-floor-room='" + id + "'] [data-hq-room-presence]", "data-hq-room-presence")
      || text("[data-hq-floor-room='" + id + "'] [data-hq-room-presence]")
      || attr("[data-hq-floor-room='" + id + "']", "data-hq-room-visual-state")
      || attr("[data-hq-floor-room='" + id + "']", "data-hq-live-status");
    const body = document.body ? document.body.innerText : "";
    return {
      href: location.href,
      origin: location.origin,
      title: document.title,
      authenticated: /\\/dashboard/.test(location.href) && Boolean(document.querySelector("[data-hq-financial-pulse], [data-hq-region='financial-pulse'], [data-hq-region='command']")),
      loginVisible: /\\/login/.test(location.href) || Boolean(document.querySelector("form[action*='login'], input[type='password']")),
      founderEmailVisible: /anthony@infinitemediaresources\\.com/i.test(body),
      sse: attr("[data-hq-sse-state]", "data-hq-sse-state"),
      commandHeadline: text("[data-hq-current-execution]"),
      commandActive: attr("[data-hq-current-execution]", "data-hq-current-active"),
      commandPresence: attr("[data-hq-region='command'] [data-hq-room-presence]", "data-hq-room-presence")
        || text("[data-hq-region='command'] [data-hq-room-presence]"),
      commandOversight: attr("[data-hq-command-oversight]", "data-hq-command-oversight"),
      currentWorkId: attr("[data-hq-current-work-id]", "data-hq-current-work-id"),
      currentMission: text("[data-hq-activity-mission]"),
      currentTask: text("[data-hq-activity-task]"),
      latestVentureWork: attr("[data-hq-latest-venture-work]", "data-hq-latest-venture-work"),
      latestVentureWorkId: attr("[data-hq-latest-venture-work]", "data-hq-latest-venture-work-id"),
      latestVentureWorkText: text("[data-hq-latest-venture-work]"),
      floorCurrentWork: attr("[data-hq-floor-current-work]", "data-hq-floor-current-work"),
      cursor: text("[data-hq-cursor-status]"),
      cursorAttr: attr("[data-hq-cursor-status]", "data-hq-cursor-status"),
      connector: text("[data-hq-cursor-connector]"),
      activeRuns: text("[data-hq-active-runs]"),
      activeRunsAttr: attr("[data-hq-active-runs]", "data-hq-active-runs"),
      operations: room("operations"),
      systemsArchitect: room("systems_architect"),
      validationStation: room("quality_control"),
      commandActiveRooms: attr("[data-hq-command-active-rooms]", "data-hq-command-active-rooms")
        || text("[data-hq-command-active-rooms]"),
      pulseCash: text('[data-hq-financial-pulse-metric="treasury_cash"]'),
      pulseAuthorized: text('[data-hq-financial-pulse-metric="authorized_capital"]'),
      pulseAllocated: text('[data-hq-financial-pulse-metric="allocated_capital"]'),
    };
  })()`) as Promise<HqProofCollect>;
}

function isActive(row: HqProofCollect): boolean {
  const headline = `${row.commandHeadline} ${row.currentMission} ${row.currentTask} ${row.floorCurrentWork}`;
  const workActive = row.commandActive === "ACTIVE" || /ACTIVE_WORK/i.test(row.commandPresence);
  const cursorActive = /ACTIVE/i.test(row.cursor) || /ACTIVE/i.test(row.cursorAttr);
  const namedPulse = /CANONICAL MISSION COMPLETION|hq-current-implementation|implementation work/i.test(headline);
  return workActive && cursorActive && (namedPulse || Number(row.activeRuns || row.activeRunsAttr || "0") > 0);
}

function isIdle(row: HqProofCollect): boolean {
  const cursorIdle = /PRESENT_IDLE|^IDLE$|^$/i.test(row.cursor) || /PRESENT_IDLE|^IDLE$|^$/i.test(row.cursorAttr);
  const commandIdle =
    row.commandActive === "IDLE" ||
    /PRESENT_IDLE|^IDLE$/i.test(row.commandPresence) ||
    /no active canonical work/i.test(row.commandHeadline);
  const runsIdle = Number(row.activeRuns || row.activeRunsAttr || "0") === 0;
  return cursorIdle && commandIdle && runsIdle;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  try {
    const context = browser.contexts()[0];
    if (!context) throw new Error("NO_QC_CONTEXT");
    const page =
      context.pages().find((row) => row.url().includes("localhost:3000")) ?? context.pages()[0];
    if (!page) throw new Error("NO_QC_PAGE");
    if (!page.url().includes("localhost:3000")) {
      await page.goto(DASHBOARD, { waitUntil: "commit", timeout: 90000 });
    } else if (page.url().includes("/login")) {
      const blocked = await collect(page);
      writeFileSync(
        `${OUT_DIR}/hq-mission-lifecycle-final-browser-proof.json`,
        `${JSON.stringify({ pausedForFounderSignIn: true, blocked }, null, 2)}\n`,
      );
      console.log(JSON.stringify({ pausedForFounderSignIn: true, blocked }, null, 2));
      return;
    }
    await page.waitForSelector("[data-hq-financial-pulse], [data-hq-region='financial-pulse'], [data-hq-region='command']", {
      timeout: 120000,
    });
    await page.waitForTimeout(1200);
    const before = await collect(page);
    if (before.loginVisible || !before.authenticated) {
      writeFileSync(
        `${OUT_DIR}/hq-mission-lifecycle-final-browser-proof.json`,
        `${JSON.stringify({ pausedForFounderSignIn: true, before }, null, 2)}\n`,
      );
      console.log(JSON.stringify({ pausedForFounderSignIn: true, before }, null, 2));
      return;
    }
    await page.screenshot({ path: `${OUT_DIR}/hq-mission-lifecycle-before.png`, fullPage: true });
    pulseCurrentImplementationWork({
      title: "INFINITY — CANONICAL MISSION COMPLETION + IDLE PROPAGATION V1",
      file: "lib/infinity/canonical-work/mission-completion.ts",
    });
    let active = before;
    let becameActive = false;
    for (let i = 0; i < 40; i += 1) {
      await page.waitForTimeout(400);
      active = await collect(page);
      if (isActive(active)) {
        becameActive = true;
        break;
      }
    }
    await page.screenshot({ path: `${OUT_DIR}/hq-mission-lifecycle-active.png`, fullPage: true });
    completeObservedImplementationWork("Canonical mission completion QC · IDLE");
    let idle = active;
    let becameIdle = false;
    for (let i = 0; i < 40; i += 1) {
      await page.waitForTimeout(400);
      idle = await collect(page);
      if (isIdle(idle)) {
        becameIdle = true;
        break;
      }
    }
    await page.screenshot({ path: `${OUT_DIR}/hq-mission-lifecycle-idle.png`, fullPage: true });
    const namedMission = /OccupancyNPV Governed Venture Spend Authority/i;
    const proof = {
      origin: idle.origin?.startsWith(ORIGIN) ? ORIGIN : idle.origin,
      port: new URL(String(idle.href || DASHBOARD)).port || "3000",
      authenticated: Boolean(idle.authenticated) && !idle.loginVisible,
      cdp: "9222",
      founderEmailVisible: idle.founderEmailVisible,
      sse: idle.sse,
      before,
      active,
      idle,
      becameActiveWithoutRefresh: becameActive,
      becameIdleWithoutRefresh: becameIdle,
      assignedRoomsActive:
        /ACTIVE/i.test(active.operations) &&
        /ACTIVE/i.test(active.systemsArchitect) &&
        /ACTIVE/i.test(active.validationStation),
      roomsIdleAfter:
        /PRESENT_IDLE|^IDLE$/i.test(idle.operations) &&
        /PRESENT_IDLE|^IDLE$/i.test(idle.systemsArchitect) &&
        /PRESENT_IDLE|^IDLE$/i.test(idle.validationStation),
      latestVentureRetained: namedMission.test(`${idle.latestVentureWork} ${idle.latestVentureWorkText}`),
      completedMissionIsCurrentWork: namedMission.test(`${idle.commandHeadline} ${idle.currentMission} ${idle.floorCurrentWork}`),
      historicalRelightsFloor:
        namedMission.test(`${idle.commandHeadline} ${idle.floorCurrentWork}`) && idle.commandActive === "ACTIVE",
    };
    writeFileSync(`${OUT_DIR}/hq-mission-lifecycle-final-browser-proof.json`, `${JSON.stringify(proof, null, 2)}\n`);
    console.log(JSON.stringify(proof, null, 2));
  } finally {
    await browser.close();
  }
}

void main();
