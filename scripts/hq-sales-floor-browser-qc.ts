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
    const rooms = Array.from(document.querySelectorAll("[data-sales-room]")).map((node) => {
      const el = node;
      const rect = el.getBoundingClientRect();
      return {
        room: el.getAttribute("data-sales-room"),
        clipped: el.scrollWidth > el.clientWidth + 1,
        right: Math.round(rect.right),
      };
    });
    return {
      scrollWidth,
      clientWidth,
      overflow: scrollWidth > clientWidth + 1,
      rooms,
    };
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
    const rooms = Array.from(document.querySelectorAll("[data-sales-room]")).map((node) => ({
      id: node.getAttribute("data-sales-room"),
      state: node.getAttribute("data-sales-room-state"),
      priority: node.getAttribute("data-sales-room-priority"),
      text: (node.textContent || "").replace(/\\s+/g, " ").trim(),
    }));
    const body = document.body.innerText;
    return {
      href: location.href,
      origin: location.origin,
      authenticated: /\\/dashboard/.test(location.href),
      salesFloorVisible: Boolean(document.querySelector("[data-hq-sales-floor='true']")),
      roomCount: rooms.length,
      rooms,
      status: attr("[data-sales-floor-status]", "data-sales-floor-status"),
      highest: attr("[data-sales-highest-room]", "data-sales-highest-room"),
      summary: text("[data-sales-floor-summary]"),
      motion: text("[data-sales-current-motion]"),
      campaign: text("[data-sales-campaign-recognized]"),
      intelligence: text("[data-hq-sales-intelligence]"),
      priorities: text("[data-sales-priorities]"),
      outcomes: text("[data-sales-latest-outcomes]"),
      fakeActive: rooms.some((row) => row.state === "ACTIVE"),
      publicLeak: /broker@|pipeline value|deal value/i.test(body),
    };
  })()`);
}

async function main() {
  mkdirSync(".qc-runtime", { recursive: true });
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  try {
    const context = browser.contexts()[0];
    if (!context) throw new Error("NO_QC_CONTEXT");
    const page = context.pages().find((row) => row.url().includes("localhost:3000")) ?? context.pages()[0];
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
    await page.waitForSelector("[data-hq-sales-floor='true']", { timeout: 120000 });
    await page.locator("[data-hq-sales-floor='true']").scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const after = await collect(page);
    await page.locator("[data-hq-sales-floor='true']").click({ timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(400);
    const selected = await collect(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator("[data-hq-sales-floor='true']").scrollIntoViewIfNeeded();
    await page.screenshot({ path: ".qc-runtime/sales-floor-desktop.png", fullPage: false, timeout: 60000 }).catch(() => undefined);
    const desktop = await collectOverflow(page, 1440, 900);
    await page.locator("[data-hq-sales-floor='true']").scrollIntoViewIfNeeded();
    const tablet = await collectOverflow(page, 768, 1024);
    await page.locator("[data-hq-sales-floor='true']").scrollIntoViewIfNeeded();
    await page.screenshot({ path: ".qc-runtime/sales-floor-tablet-768.png", fullPage: false, timeout: 15000 }).catch(() => undefined);
    const mobile = await collectOverflow(page, 390, 844);
    await page.locator("[data-hq-sales-floor='true']").scrollIntoViewIfNeeded();
    await page.screenshot({ path: ".qc-runtime/sales-floor-mobile-390.png", fullPage: false, timeout: 15000 }).catch(() => undefined);
    await page.setViewportSize({ width: 1440, height: 900 });
    const live = await page.evaluate(`(async () => {
      try {
        const res = await fetch("/api/operator-console/hq-live-state", { credentials: "include" });
        if (!res.ok) return { status: res.status };
        const json = await res.json();
        const sales = (json.departments || []).find((row) => row.id === "sales_floor");
        return {
          status: res.status,
          salesId: sales ? sales.id : null,
          salesState: sales ? sales.state : null,
          view: sales && sales.detail ? sales.detail.salesFloorView : null,
        };
      } catch (error) {
        return { error: String(error) };
      }
    })()`);
    const materialConsole = consoleErrors.filter((row) => !/favicon|hydration warning|Download the React DevTools/i.test(row));
    const proof = {
      origin: ORIGIN,
      port: "3000",
      process: "localhost:3000 via Chrome CDP 9222",
      after,
      selected,
      live,
      overflow: { desktop, tablet, mobile },
      runtime: {
        consoleErrors: materialConsole,
        pageErrors,
        material: materialConsole.length > 0 || pageErrors.length > 0,
      },
    };
    writeFileSync(".qc-runtime/sales-floor-browser-qc.json", `${JSON.stringify(proof, null, 2)}\n`);
    console.log(JSON.stringify(proof, null, 2));
  } finally {
    browser.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
