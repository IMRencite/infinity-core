import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, type Page } from "@playwright/test";
import {
  completeObservedImplementationWork,
  pulseCurrentImplementationWork,
} from "../lib/infinity/canonical-work/implementation-observe";

const ORIGIN = "http://localhost:3000";
const DASHBOARD = `${ORIGIN}/dashboard`;

type HqIdleCollect = {
  href: string;
  origin: string;
  authenticated: boolean;
  sse: string;
  currentWork: string;
  currentMission: string;
  currentTask: string;
  cursor: string;
  connector: string;
  activeRuns: string;
  pulseCash: string;
  pulseAuthorized: string;
  pulseAllocated: string;
  systems: string[];
};

async function collect(page: Page): Promise<HqIdleCollect> {
  return page.evaluate(`(() => {
    const text = (sel) => {
      const el = document.querySelector(sel);
      return el && el.textContent ? el.textContent.replace(/\\s+/g, " ").trim() : "";
    };
    const attr = (sel, name) => {
      const el = document.querySelector(sel);
      return el ? el.getAttribute(name) || "" : "";
    };
    const systems = Array.from(document.querySelectorAll('[aria-label="Command system status"] li')).map((row) =>
      row.textContent ? row.textContent.replace(/\\s+/g, " ").trim() : "",
    );
    return {
      href: location.href,
      origin: location.origin,
      authenticated: /\\/dashboard/.test(location.href),
      sse: attr("[data-hq-sse-state]", "data-hq-sse-state"),
      currentWork: text("[data-hq-current-execution]") || text("[data-hq-activity-mission]"),
      currentMission: text("[data-hq-activity-mission]"),
      currentTask: text("[data-hq-activity-task]"),
      cursor: text("[data-hq-cursor-status]"),
      connector: text("[data-hq-cursor-connector]"),
      activeRuns: text("[data-hq-active-runs]"),
      pulseCash: text('[data-hq-financial-pulse-metric="treasury_cash"]'),
      pulseAuthorized: text('[data-hq-financial-pulse-metric="authorized_capital"]'),
      pulseAllocated: text('[data-hq-financial-pulse-metric="allocated_capital"]'),
      systems,
    };
  })()`) as Promise<HqIdleCollect>;
}

async function main() {
  mkdirSync(".qc-runtime", { recursive: true });
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  try {
    const context = browser.contexts()[0];
    if (!context) throw new Error("NO_QC_CONTEXT");
    let page = context.pages().find((row) => row.url().includes("localhost:3000")) ?? context.pages()[0];
    if (!page) throw new Error("NO_QC_PAGE");
    if (!page.url().includes("/dashboard")) {
      await page.goto(DASHBOARD, { waitUntil: "commit", timeout: 90000 });
    }
    await page.waitForSelector("[data-hq-financial-pulse], [data-hq-region='financial-pulse']", { timeout: 120000 });
    await page.waitForTimeout(1500);
    const before = await collect(page);
    pulseCurrentImplementationWork({
      title: "INFINITY — CANONICAL MISSION COMPLETION + IDLE PROPAGATION V1",
      file: "lib/infinity/canonical-work/mission-completion.ts",
    });
    let active = before;
    let becameActive = false;
    for (let i = 0; i < 24; i += 1) {
      await page.waitForTimeout(500);
      active = await collect(page);
      if (/ACTIVE|CANONICAL MISSION COMPLETION|mission-completion/i.test(`${active.currentWork} ${active.currentTask} ${active.cursor}`)) {
        becameActive = true;
        break;
      }
    }
    completeObservedImplementationWork("Canonical mission completion QC · IDLE");
    let idle = active;
    let becameIdle = false;
    for (let i = 0; i < 24; i += 1) {
      await page.waitForTimeout(500);
      idle = await collect(page);
      const cursorIdle = /PRESENT_IDLE|IDLE/i.test(idle.cursor) || idle.cursor === "";
      const workIdle = !/ACTIVE_WORK/i.test(idle.currentWork) && !/CANONICAL MISSION COMPLETION/i.test(idle.currentMission);
      if (cursorIdle || workIdle) {
        becameIdle = /PRESENT_IDLE|IDLE|^$/.test(idle.cursor) || Number(idle.activeRuns || "0") === 0;
        if (becameIdle) break;
      }
    }
    const proof = {
      origin: idle.origin?.startsWith(ORIGIN) ? ORIGIN : idle.origin,
      authenticated: Boolean(idle.authenticated),
      port: new URL(String(idle.href || DASHBOARD)).port || "3000",
      before,
      active,
      idle,
      becameActiveWithoutRefresh: becameActive,
      becameIdleWithoutRefresh: becameIdle,
    };
    writeFileSync(".qc-runtime/hq-mission-completion-idle-browser-qc.json", `${JSON.stringify(proof, null, 2)}\n`);
    console.log(JSON.stringify(proof, null, 2));
  } finally {
    await browser.close();
  }
}

void main();
