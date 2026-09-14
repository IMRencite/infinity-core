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

async function collect(page: Page): Promise<{
  href: string;
  authenticated: boolean;
  warning: string;
  warningPresent: boolean;
  rawDiagnostic: boolean;
  mercuryState: string;
  authorized: string;
  allocated: string;
  spendAuthority: string;
  committed: string;
  actualSpend: string;
  cash: string;
  policy: boolean;
  detailsHidden: boolean;
  bodyHasSk: boolean;
  currentWork: string;
}> {
  return page.evaluate(`(() => {
    const text = (sel) => {
      const el = document.querySelector(sel);
      return el && el.textContent ? el.textContent.replace(/\\s+/g, " ").trim() : "";
    };
    const body = document.body.innerText;
    const warning = document.querySelector("[data-hq-mercury-warning]");
    const grab = (label) => {
      const re = new RegExp(label + "\\\\s*(\\\\$[0-9]+(?:\\\\.[0-9]+)?|UNKNOWN|NOT_SET|VERIFICATION_REQUIRED)", "i");
      return body.match(re)?.[1] ?? "";
    };
    return {
      href: location.href,
      authenticated: /\\/dashboard/.test(location.href),
      warning: warning ? warning.textContent.replace(/\\s+/g, " ").trim() : "",
      warningPresent: Boolean(warning),
      rawDiagnostic: /PRODUCTION\\s*·\\s*last sync|accounts\\s+\\d+\\s*·|auth\\/session\\/config|PROVIDER UNAVAILABLE/i.test(body),
      mercuryState: document.querySelector("[data-hq-mercury-state]")?.getAttribute("data-hq-mercury-state") || "",
      authorized: grab("Authorized capital") || grab("Authorized"),
      allocated: grab("Allocated capital") || grab("Allocated"),
      spendAuthority: grab("Spend authority"),
      committed: grab("Committed"),
      actualSpend: grab("Actual spend"),
      cash: grab("Verified treasury cash") || grab("Verified cash"),
      policy: /Treasury policy/i.test(body),
      detailsHidden: Boolean(document.querySelector(".hq-treasury-mercury-details")),
      bodyHasSk: /sk_live_|Bearer\\s+[A-Za-z0-9]/i.test(body),
      currentWork: text("[data-hq-current-execution]"),
    };
  })()`) as Promise<{
    href: string;
    authenticated: boolean;
    warning: string;
    warningPresent: boolean;
    rawDiagnostic: boolean;
    mercuryState: string;
    authorized: string;
    allocated: string;
    spendAuthority: string;
    committed: string;
    actualSpend: string;
    cash: string;
    policy: boolean;
    detailsHidden: boolean;
    bodyHasSk: boolean;
    currentWork: string;
  }>;
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
    await page.waitForSelector("[aria-label='Treasury & Capital'], [data-hq-mercury-warning], [data-hq-spend-authority-panel]", {
      timeout: 120000,
    });
    await page.waitForTimeout(2500);
    const after = await collect(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator("[aria-label='Treasury & Capital']").first().screenshot({ path: ".qc-runtime/mercury-warning-desktop.png" }).catch(() => undefined);
    const desktop = await collectOverflow(page, 1440, 900);
    const tablet = await collectOverflow(page, 768, 1024);
    await page.locator("[aria-label='Treasury & Capital']").first().screenshot({ path: ".qc-runtime/mercury-warning-tablet.png" }).catch(() => undefined);
    const mobile = await collectOverflow(page, 390, 844);
    await page.locator("[aria-label='Treasury & Capital']").first().screenshot({ path: ".qc-runtime/mercury-warning-mobile.png" }).catch(() => undefined);
    await page.setViewportSize({ width: 1440, height: 900 });
    const proof = {
      origin: ORIGIN,
      port: "3000",
      authenticated: after.authenticated,
      after,
      overflow: { desktop, tablet, mobile },
    };
    writeFileSync(".qc-runtime/mercury-warning-browser-qc.json", `${JSON.stringify(proof, null, 2)}\n`);
    console.log(JSON.stringify(proof, null, 2));
  } finally {
    await browser.close();
  }
}

void main();
