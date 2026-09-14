import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, type Page } from "@playwright/test";

const ORIGIN = "http://localhost:3000";
const DASHBOARD = `${ORIGIN}/dashboard`;

async function collectOverflow(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(500);
  return page.evaluate(`(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(doc.scrollWidth, body && body.scrollWidth ? body.scrollWidth : 0);
    const clientWidth = doc.clientWidth;
    return { scrollWidth, clientWidth, overflow: scrollWidth > clientWidth + 1 };
  })()`);
}

async function collect(page: Page): Promise<{
  href: string;
  origin: string;
  authenticated: boolean;
  [key: string]: unknown;
}> {
  return page.evaluate(`(() => {
    const text = (sel) => {
      const el = document.querySelector(sel);
      return el && el.textContent ? el.textContent.replace(/\\s+/g, " ").trim() : "";
    };
    const attr = (sel, name) => {
      const el = document.querySelector(sel);
      return el ? el.getAttribute(name) || "" : "";
    };
    const metricValue = (id) => {
      const el = document.querySelector('[data-hq-financial-pulse-metric="' + id + '"] .hq-financial-pulse__value');
      if (el && el.textContent) return el.textContent.replace(/\\s+/g, " ").trim();
      const card = document.querySelector('[data-hq-financial-pulse-metric="' + id + '"]');
      return card && card.textContent ? card.textContent.replace(/\\s+/g, " ").trim() : "";
    };
    const overview = (label) => {
      const nodes = Array.from(document.querySelectorAll("[data-hq-spend-authority-panel] dt, [data-hq-occupancy-spend-authority] dt, [aria-label='Capital Overview'] dt"));
      const dt = nodes.find((row) => row.textContent && row.textContent.trim().toLowerCase() === label.toLowerCase());
      const dd = dt && dt.nextElementSibling;
      return dd && dd.textContent ? dd.textContent.replace(/\\s+/g, " ").trim() : "";
    };
    const body = document.body.innerText;
    return {
      href: location.href,
      origin: location.origin,
      authenticated: /\\/dashboard/.test(location.href),
      pulseCash: metricValue("treasury_cash"),
      pulseAuthorized: metricValue("authorized_capital"),
      pulseAllocated: metricValue("allocated_capital"),
      pulseSpend: metricValue("actual_spend"),
      pulseStatus: attr("[data-hq-financial-pulse]", "data-hq-financial-pulse-status"),
      completeness: attr("[data-hq-financial-pulse]", "data-hq-financial-completeness"),
      allocated: overview("Allocated capital") || overview("Allocated"),
      spendAuthority: overview("Spend authority"),
      effective: overview("Effective spend authority"),
      committed: overview("Committed"),
      actualSpend: overview("Actual spend"),
      remaining: overview("Remaining spend authority"),
      unused: overview("Unused allocation"),
      paidAcquisition: overview("Paid acquisition"),
      status: overview("Status"),
      source: overview("Source"),
      freshness: overview("Freshness"),
      verifiedCash: overview("Verified treasury cash"),
      authorizedCapital: overview("Authorized capital"),
      panel: Boolean(document.querySelector("[data-hq-spend-authority-panel]")),
      treasury: Boolean(document.querySelector("[aria-label='Treasury control center']")),
      setAuthority: Boolean(Array.from(document.querySelectorAll("button")).some((row) => /set spend authority/i.test(row.textContent || ""))),
      sse: attr("[data-hq-sse-state]", "data-hq-sse-state"),
      currentWork: text("[data-hq-current-execution]") || text("[data-hq-activity-mission]"),
      missionVisible: /OccupancyNPV Governed Venture Spend Authority V1/i.test(body),
      bodyHasNotConfigured: /Treasury\\\\s+NOT CONFIGURED/i.test(body),
      mercuryReadOnly: /READ ONLY/i.test(body),
      mercuryLive: /Mercury[^\\n]{0,80}LIVE/i.test(body) || /MERCURY\\\\s+LIVE/i.test(body),
      stripeLive: /Stripe[^\\n]{0,80}LIVE/i.test(body) || /STRIPE\\\\s+LIVE/i.test(body),
      executeDisabled: Boolean(document.querySelector("button[disabled][data-kind='future']")),
      labeledInputs: Array.from(document.querySelectorAll("[data-hq-spend-authority-panel] label")).length,
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
    if (!page.url().includes("/dashboard")) {
      await page.goto(DASHBOARD, { waitUntil: "commit", timeout: 90000 });
    } else {
      await page.reload({ waitUntil: "commit", timeout: 90000 });
    }
    await page.waitForSelector("[data-hq-financial-pulse], [aria-label='Treasury control center'], [data-hq-spend-authority-panel]", {
      timeout: 120000,
    });
    await page.waitForFunction(
      `(() => {
        const cash = document.querySelector('[data-hq-financial-pulse-metric="treasury_cash"] .hq-financial-pulse__value');
        const panel = document.querySelector("[data-hq-spend-authority-panel]");
        return Boolean((cash && cash.textContent && cash.textContent.trim()) || panel);
      })()`,
      { timeout: 30000 },
    ).catch(() => undefined);
    await page.waitForTimeout(2500);
    const treasuryTab = page.getByRole("button", { name: /treasury|profit lab|strategy/i }).first();
    if (await treasuryTab.count()) {
      await treasuryTab.click().catch(() => undefined);
      await page.waitForTimeout(800);
    }
    const panel = page.locator("[data-hq-spend-authority-panel]");
    if (await panel.count()) {
      await panel.first().scrollIntoViewIfNeeded().catch(() => undefined);
    }
    await page.waitForTimeout(400);
    const after = (await collect(page)) as {
      href: string;
      origin: string;
      authenticated: boolean;
    };
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: ".qc-runtime/spend-authority-desktop.png", fullPage: false });
    if (await panel.count()) {
      await panel.first().screenshot({ path: ".qc-runtime/spend-authority-panel.png" }).catch(() => undefined);
    }
    const desktop = await collectOverflow(page, 1440, 900);
    await page.screenshot({ path: ".qc-runtime/spend-authority-desktop-1440.png", fullPage: false });
    const tablet = await collectOverflow(page, 768, 1024);
    await page.screenshot({ path: ".qc-runtime/spend-authority-tablet-768.png", fullPage: false });
    const mobile = await collectOverflow(page, 390, 844);
    await page.screenshot({ path: ".qc-runtime/spend-authority-mobile-390.png", fullPage: false });
    await page.setViewportSize({ width: 1440, height: 900 });
    const live = await page.evaluate(`(async () => {
      try {
        const res = await fetch("/api/operator-console/hq-live-state", { credentials: "include" });
        if (!res.ok) return { status: res.status };
        const json = await res.json();
        const treasury = json.financial_truth?.treasury_control ?? json.treasury_control ?? null;
        return {
          status: res.status,
          cash: treasury?.verified_treasury_cash ?? null,
          authorized: treasury?.authorized_capital ?? null,
          allocated: treasury?.allocated_capital ?? null,
          mercury: treasury?.bank_connection ?? json.financial_truth?.mercury?.connection ?? null,
          stripe: json.financial_truth?.stripe?.connection ?? null,
          write: treasury?.mercury_write_access ?? null,
          movement: treasury?.money_movement_enabled ?? null,
          authorities: treasury?.spend_authorities ?? null,
        };
      } catch (error) {
        return { error: String(error) };
      }
    })()`);
    const proof = {
      origin: after.href.startsWith(ORIGIN) ? ORIGIN : after.origin,
      authenticated: after.authenticated,
      port: new URL(after.href || DASHBOARD).port || "3000",
      after,
      live,
      overflow: { desktop, tablet, mobile },
    };
    writeFileSync(".qc-runtime/spend-authority-browser-qc.json", `${JSON.stringify(proof, null, 2)}\n`);
    console.log(JSON.stringify(proof, null, 2));
  } finally {
    await browser.close();
  }
}

void main();
