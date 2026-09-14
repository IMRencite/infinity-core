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
    const overview = (root, label) => {
      const nodes = Array.from((root || document).querySelectorAll("dt"));
      const dt = nodes.find((row) => row.textContent && row.textContent.trim().toLowerCase() === label.toLowerCase());
      const dd = dt && dt.nextElementSibling;
      return dd && dd.textContent ? dd.textContent.replace(/\\s+/g, " ").trim() : "";
    };
    const panel = document.querySelector("[data-hq-commitment-panel]");
    const authority = document.querySelector("[data-hq-spend-authority-panel]");
    const body = document.body.innerText;
    return {
      href: location.href,
      origin: location.origin,
      authenticated: /\\/dashboard/.test(location.href),
      treasury: Boolean(document.querySelector("[aria-label='Treasury control center']")),
      commitmentPanel: Boolean(panel),
      authorityPanel: Boolean(authority),
      ledger: Boolean(document.querySelector("[data-hq-commitment-ledger]")),
      reserveButton: Boolean(Array.from(document.querySelectorAll("button")).some((row) => /reserve commitment/i.test(row.textContent || ""))),
      helper: /This reserves part of the venture/i.test(body) && /No payment is sent/i.test(body),
      allocation: overview(panel, "Allocation"),
      spendAuthority: overview(panel, "Spend Authority"),
      committed: overview(panel, "Committed"),
      available: overview(panel, "Available Spend Authority"),
      actualSpend: overview(panel, "Actual Spend"),
      paidAcquisition: overview(panel, "Paid Acquisition"),
      authorityAllocated: overview(authority, "Allocated capital"),
      authorityCeiling: overview(authority, "Spend authority"),
      authorityCommitted: overview(authority, "Committed"),
      emptyLedger: /No active commitments/i.test(body),
      mercuryReadOnly: /READ ONLY/i.test(body),
      missionTitle: /Venture Financial Commitment V1/i.test(body),
      sse: attr("[data-hq-sse-state]", "data-hq-sse-state"),
      currentWork: text("[data-hq-current-execution]") || text("[data-hq-activity-mission]"),
      commandStatus: attr("[data-hq-command-status]", "data-hq-command-status") || text("[data-hq-command-status]"),
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
    await page.waitForSelector("[data-hq-financial-pulse], [aria-label='Treasury control center']", { timeout: 120000 });
    await page.waitForTimeout(2000);
    const treasuryTab = page.getByRole("button", { name: /treasury|profit lab|strategy/i }).first();
    if (await treasuryTab.count()) {
      await treasuryTab.click().catch(() => undefined);
      await page.waitForTimeout(800);
    }
    const panel = page.locator("[data-hq-commitment-panel]");
    if (await panel.count()) {
      await panel.first().scrollIntoViewIfNeeded().catch(() => undefined);
    }
    await page.waitForTimeout(400);
    const after = await collect(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: ".qc-runtime/financial-commitment-desktop.png", fullPage: false, timeout: 60000 }).catch(() => undefined);
    if (await panel.count()) {
      await panel.first().screenshot({ path: ".qc-runtime/financial-commitment-panel.png", timeout: 15000 }).catch(() => undefined);
    }
    const desktop = await collectOverflow(page, 1440, 900);
    const tablet = await collectOverflow(page, 768, 1024);
    await page.screenshot({ path: ".qc-runtime/financial-commitment-tablet-768.png", fullPage: false, timeout: 15000 }).catch(() => undefined);
    const mobile = await collectOverflow(page, 390, 844);
    await page.screenshot({ path: ".qc-runtime/financial-commitment-mobile-390.png", fullPage: false, timeout: 15000 }).catch(() => undefined);
    await page.setViewportSize({ width: 1440, height: 900 });
    const live = await page.evaluate(`(async () => {
      try {
        const res = await fetch("/api/operator-console/hq-live-state", { credentials: "include" });
        if (!res.ok) return { status: res.status };
        const json = await res.json();
        const treasury = json.financial_truth?.treasury_control ?? json.treasury_control ?? null;
        const occupancy = (treasury?.spend_authorities || []).find((row) => /occupancy|7e7e924e/i.test(row.venture_id || "")) || (treasury?.spend_authorities || [])[0] || null;
        return {
          status: res.status,
          cash: treasury?.verified_treasury_cash ?? null,
          authorized: treasury?.authorized_capital ?? null,
          allocated: treasury?.allocated_capital ?? null,
          write: treasury?.mercury_write_access ?? null,
          movement: treasury?.money_movement_enabled ?? null,
          commitments: treasury?.venture_financial_commitments ?? null,
          occupancy,
          currentWork: json.current_work?.title ?? json.command?.current_mission ?? json.activity?.mission ?? null,
          commandStatus: json.command?.status ?? json.floor?.status ?? null,
        };
      } catch (error) {
        return { error: String(error) };
      }
    })()`);
    const proof = {
      origin: ORIGIN,
      port: "3000",
      process: "next start",
      after,
      live,
      overflow: { desktop, tablet, mobile },
    };
    writeFileSync(".qc-runtime/financial-commitment-browser-qc.json", `${JSON.stringify(proof, null, 2)}\n`);
    console.log(JSON.stringify(proof, null, 2));
  } finally {
    await browser.close();
  }
}

void main();
