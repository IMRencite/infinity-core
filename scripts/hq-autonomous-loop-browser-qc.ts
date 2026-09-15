import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, type Page } from "@playwright/test";

const ORIGIN = "http://localhost:3000";
const DASHBOARD = `${ORIGIN}/dashboard`;

async function collectOverflow(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(400);
  return page.evaluate(`(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(doc.scrollWidth, body && body.scrollWidth ? body.scrollWidth : 0);
    const clientWidth = doc.clientWidth;
    return { scrollWidth, clientWidth, overflow: scrollWidth > clientWidth + 1 };
  })()`);
}

async function collect(page: Page) {
  return page.evaluate(`(() => {
    const text = (sel) => {
      const el = document.querySelector(sel);
      return el && el.textContent ? el.textContent.replace(/\\s+/g, " ").trim() : "";
    };
    const attr = (sel, name) => {
      const el = document.querySelector(sel);
      return el ? el.getAttribute(name) || "" : "";
    };
    const loop = document.querySelector("[data-hq-autonomous-operations]");
    const body = document.body.innerText;
    return {
      href: location.href,
      origin: location.origin,
      authenticated: /\\/dashboard/.test(location.href),
      loopVisible: Boolean(loop),
      loopState: attr("[data-hq-loop-state]", "data-hq-loop-state") || text("[data-hq-loop-state-value]"),
      reason: text("[data-hq-loop-reason]"),
      mission: text("[data-hq-loop-mission]"),
      rooms: text("[data-hq-loop-rooms]"),
      agents: text("[data-hq-loop-agents]"),
      lastCompleted: text("[data-hq-loop-last-completed]"),
      currentWork: text("[data-hq-current-execution]") || text("[data-hq-activity-mission]"),
      sse: attr("[data-hq-sse-state]", "data-hq-sse-state"),
      idle: /IDLE — no active canonical work/i.test(body) || /no active canonical work/i.test(body),
    };
  })()`);
}

async function main() {
  mkdirSync(".qc-runtime", { recursive: true });
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  try {
    const context = browser.contexts()[0];
    if (!context) throw new Error("NO_QC_CONTEXT");
    let page = context.pages().find((row) => row.url().includes("localhost:3000")) ?? context.pages()[0];
    if (!page) throw new Error("NO_QC_PAGE");
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (error) => {
      pageErrors.push(String(error));
    });
    if (!page.url().includes("/dashboard")) {
      await page.goto(DASHBOARD, { waitUntil: "commit", timeout: 90000 });
    } else {
      await page.reload({ waitUntil: "commit", timeout: 90000 });
    }
    await page.waitForSelector("[data-hq-autonomous-operations]", { timeout: 120000 });
    await page.waitForFunction(() => {
      const reason = document.querySelector("[data-hq-loop-reason]");
      const state = document.querySelector("[data-hq-loop-state-value]");
      const reasonText = reason && reason.textContent ? reason.textContent : "";
      const stateText = state && state.textContent ? state.textContent : "";
      return /EXISTING_GROWTH|NO_ACTION|REPAIR|WAIT_FOR|CONTINUE|IDLE_NO_ACTION/.test(`${reasonText} ${stateText}`);
    }, { timeout: 30000 }).catch(() => undefined);
    await page.waitForTimeout(800);
    const after = await collect(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: ".qc-runtime/autonomous-loop-desktop.png", fullPage: false, timeout: 60000 }).catch(() => undefined);
    const desktop = await collectOverflow(page, 1440, 900);
    const tablet = await collectOverflow(page, 768, 1024);
    await page.screenshot({ path: ".qc-runtime/autonomous-loop-tablet-768.png", fullPage: false, timeout: 15000 }).catch(() => undefined);
    const mobile = await collectOverflow(page, 390, 844);
    await page.screenshot({ path: ".qc-runtime/autonomous-loop-mobile-390.png", fullPage: false, timeout: 15000 }).catch(() => undefined);
    await page.setViewportSize({ width: 1440, height: 900 });
    const live = await page.evaluate(`(async () => {
      try {
        const res = await fetch("/api/operator-console/hq-live-state", { credentials: "include" });
        if (!res.ok) return { status: res.status };
        const json = await res.json();
        return {
          status: res.status,
          loop: json.autonomousOperating ?? null,
          currentWork: json.commandActivity?.nowInspecting?.currentMission ?? null,
          activeMissions: json.commandActivity?.counts?.activeMissions ?? null,
          agentStatus: json.commandActivity?.nowInspecting?.status ?? json.coding?.externalImplementationAgent ?? null,
          sse: json.lastEventType ?? null,
        };
      } catch (error) {
        return { error: String(error) };
      }
    })()`);
    const materialConsole = consoleErrors.filter((row) => !/favicon|hydration warning|Download the React DevTools/i.test(row));
    const proof = {
      origin: ORIGIN,
      port: "3000",
      process: "next start",
      after,
      live,
      overflow: { desktop, tablet, mobile },
      runtime: {
        consoleErrors: materialConsole,
        pageErrors,
        material: materialConsole.length > 0 || pageErrors.length > 0,
      },
    };
    writeFileSync(".qc-runtime/autonomous-loop-browser-qc.json", `${JSON.stringify(proof, null, 2)}\n`);
    console.log(JSON.stringify(proof, null, 2));
  } finally {
    await browser.close();
  }
}

void main();
