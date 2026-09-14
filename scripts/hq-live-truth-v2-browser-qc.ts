import { chromium, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { pulseCurrentImplementationWork } from "../lib/infinity/canonical-work/implementation-observe";

const ORIGIN = "http://localhost:3000";
const DASHBOARD = `${ORIGIN}/dashboard`;

type HqCollect = {
  title: string;
  href: string;
  origin: string;
  user: boolean;
  treasuryCash: string;
  authorized: string;
  allocated: string;
  completeness: string;
  pulseStatus: string;
  reconciliation: string;
  sse: string;
  currentWork: string;
  currentMission: string;
  currentTask: string;
  currentStep: string;
  cursor: string;
  connector: string;
  activeRuns: string;
  selectedVenture: string;
  systems: string[];
  bodyHasNotConfigured: boolean;
  bodyHasUnavailable: boolean;
  bodyHasNoneSelected: boolean;
  bodySnippet: string;
};

type OverflowCollect = {
  scrollWidth: number;
  clientWidth: number;
  overflow: boolean;
  offenders: Array<{ selector: string; right: number; width: number; parentWidth: number }>;
};

function grab(text: string, pattern: RegExp): string {
  return text.match(pattern)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

async function collectOverflow(page: Page, width: number, height: number): Promise<OverflowCollect> {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(500);
  return page.evaluate(`(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(doc.scrollWidth, body && body.scrollWidth ? body.scrollWidth : 0);
    const clientWidth = doc.clientWidth;
    const offenders = [];
    const nodes = Array.from(document.querySelectorAll("body *"));
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      if (rect.right > clientWidth + 1) {
        const id = node.id ? "#" + node.id : "";
        const cls = node.className && typeof node.className === "string"
          ? "." + node.className.trim().split(/\\s+/).slice(0, 3).join(".")
          : "";
        const parentWidth = node.parentElement ? node.parentElement.getBoundingClientRect().width : 0;
        offenders.push({
          selector: (node.tagName.toLowerCase() + id + cls).slice(0, 160),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          parentWidth: Math.round(parentWidth),
        });
      }
    }
    return { scrollWidth, clientWidth, overflow: scrollWidth > clientWidth + 1, offenders: offenders.slice(0, 16) };
  })()`) as Promise<OverflowCollect>;
}

async function collectHq(page: Page): Promise<HqCollect> {
  return page.evaluate(`(() => {
    const metric = (id) => {
      const el = document.querySelector('[data-hq-financial-pulse-metric="' + id + '"]');
      return el && el.textContent ? el.textContent.replace(/\\s+/g, " ").trim() : "";
    };
    const systems = Array.from(document.querySelectorAll('[aria-label="Command system status"] li')).map((row) =>
      row.textContent ? row.textContent.replace(/\\s+/g, " ").trim() : ""
    );
    const body = document.body.innerText;
    const attr = (sel, name) => {
      const el = document.querySelector(sel);
      return el ? el.getAttribute(name) || "" : "";
    };
    const text = (sel) => {
      const el = document.querySelector(sel);
      return el && el.textContent ? el.textContent.replace(/\\s+/g, " ").trim() : "";
    };
    return {
      title: document.title,
      href: location.href,
      origin: location.origin,
      user: /anthony@infinitemediaresources\\.com/i.test(body),
      treasuryCash: metric("treasury_cash"),
      authorized: metric("authorized_capital"),
      allocated: metric("allocated_capital"),
      completeness: attr("[data-hq-financial-pulse]", "data-hq-financial-completeness") || text("[data-hq-financial-completeness]"),
      pulseStatus: attr("[data-hq-financial-pulse]", "data-hq-financial-pulse-status"),
      reconciliation: text("[data-hq-settlement-tone]"),
      sse: attr("[data-hq-sse-state]", "data-hq-sse-state"),
      currentWork: text("[data-hq-current-execution]"),
      currentMission: text("[data-hq-activity-mission]"),
      currentTask: text("[data-hq-activity-task]"),
      currentStep: text("[data-hq-activity-step]"),
      cursor: text("[data-hq-cursor-status]"),
      connector: text("[data-hq-cursor-connector]"),
      activeRuns: text("[data-hq-active-runs]"),
      selectedVenture: text("[data-hq-selected-venture-identity]"),
      systems,
      bodyHasNotConfigured: /Treasury\\s+NOT CONFIGURED/i.test(body),
      bodyHasUnavailable: /TASK DETAIL UNAVAILABLE/i.test(body),
      bodyHasNoneSelected: /NONE SELECTED/i.test(body),
      bodySnippet: body.slice(0, 8000),
    };
  })()`) as Promise<HqCollect>;
}

async function main() {
  mkdirSync(".qc-runtime", { recursive: true });
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  try {
    const context = browser.contexts()[0];
    if (!context) throw new Error("NO_QC_CONTEXT");
    let page = context.pages().find((row) => row.url().includes("localhost:3000")) ?? context.pages()[0];
    if (!page) throw new Error("NO_QC_PAGE");
    if (!page.url().includes("localhost:3000")) {
      await page.goto(DASHBOARD, { waitUntil: "commit", timeout: 90000 });
    } else if (!page.url().includes("/dashboard")) {
      await page.goto(DASHBOARD, { waitUntil: "commit", timeout: 90000 });
    } else {
      await page.reload({ waitUntil: "commit", timeout: 90000 });
    }
    await page.waitForSelector("[data-hq-financial-pulse], [data-hq-region='financial-pulse']", {
      timeout: 120000,
    });
    await page.waitForFunction(
      `(() => {
        const cursor = document.querySelector("[data-hq-cursor-status]");
        const cash = document.querySelector('[data-hq-financial-pulse-metric="treasury_cash"]');
        return Boolean(cursor && cursor.textContent && cursor.textContent.trim() && cash && cash.textContent && cash.textContent.trim());
      })()`,
      { timeout: 30000 },
    ).catch(() => undefined);
    await page.waitForTimeout(2000);
    const afterRepair = await collectHq(page);
    await page.screenshot({ path: ".qc-runtime/hq-v2-desktop.png", fullPage: true });
    const desktop = await collectOverflow(page, 1440, 900);
    await page.screenshot({ path: ".qc-runtime/hq-v2-desktop-1440.png", fullPage: false });
    const tablet = await collectOverflow(page, 768, 1024);
    await page.screenshot({ path: ".qc-runtime/hq-v2-tablet-768.png", fullPage: false });
    const mobile = await collectOverflow(page, 390, 844);
    await page.screenshot({ path: ".qc-runtime/hq-v2-mobile-390.png", fullPage: false });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);
    const beforeTick = await collectHq(page);
    const pulsed = pulseCurrentImplementationWork({
      file: "lib/infinity/financial-truth/treasury-cash-truth.ts",
    });
    let afterTick = beforeTick;
    let updatedWithoutRefresh = false;
    for (let i = 0; i < 24; i += 1) {
      await page.waitForTimeout(500);
      afterTick = await collectHq(page);
      const beforeTask = beforeTick.currentTask || beforeTick.currentStep || beforeTick.currentWork;
      const afterTask = afterTick.currentTask || afterTick.currentStep || afterTick.currentWork;
      if (afterTask && beforeTask && afterTask !== beforeTask) {
        updatedWithoutRefresh = true;
        break;
      }
    }
    const body = afterRepair.bodySnippet;
    const proof = {
      origin: afterRepair.href.startsWith(ORIGIN) ? ORIGIN : afterRepair.origin,
      authenticated: afterRepair.user || /\/dashboard/.test(afterRepair.href),
      port: new URL(afterRepair.href || DASHBOARD).port || "3000",
      afterRepair: {
        ...afterRepair,
        bodySnippet: undefined,
        registrar: grab(body, /Registrar[\s\S]{0,80}?(Namecheap[^\n]*)/i),
        dns: grab(body, /DNS[\s\S]{0,80}?(Cloudflare[^\n]*)/i),
        hosting: grab(body, /Hosting[\s\S]{0,80}?(Vercel[^\n]*)/i),
        payments: grab(body, /Payments[\s\S]{0,80}?(Stripe[^\n]*)/i),
        revenue: grab(body, /Revenue[\s:]*([^\n]+)/i),
        learning: grab(body, /Learning[\s:]*([^\n]+)/i),
        communication: grab(body, /Communication[\s:]*([^\n]+)/i),
        nativeCoder: grab(body, /Native Coder[\s:]*([^\n]+)/i),
      },
      overflow: { desktop, tablet, mobile },
      sse: {
        state: afterTick.sse || afterRepair.sse,
        pulsed_description: pulsed?.description ?? null,
        pulsed_title: pulsed?.title ?? null,
        before_task: beforeTick.currentTask || beforeTick.currentStep || beforeTick.currentWork,
        after_task: afterTick.currentTask || afterTick.currentStep || afterTick.currentWork,
        before_mission: beforeTick.currentMission || beforeTick.currentWork,
        after_mission: afterTick.currentMission || afterTick.currentWork,
        updated_without_refresh: updatedWithoutRefresh,
      },
    };
    writeFileSync(".qc-runtime/hq-live-truth-v2-browser-qc.json", JSON.stringify(proof, null, 2));
    console.log(JSON.stringify(proof, null, 2));
  } finally {
    await browser.close();
  }
}

void main();
