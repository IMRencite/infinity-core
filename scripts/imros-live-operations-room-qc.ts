import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { PUBLIC_OPERATIONS_ROOM_ENDPOINT, PUBLIC_OPERATIONS_ROOM_ROUTE } from "../lib/infinity/public-operations-room/contract";
import { evaluatePublicOperationsBrowserRuntimeGate } from "../lib/infinity/public-operations-room/gates";

const ORIGIN = "http://localhost:3000";

async function overflow(page: import("@playwright/test").Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    const doc = document.documentElement;
    return { overflow: doc.scrollWidth > doc.clientWidth + 1, scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage();
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (req) => {
    try {
      requests.push(new URL(req.url()).pathname);
    } catch {
      requests.push(req.url());
    }
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  await page.goto(`${ORIGIN}${PUBLIC_OPERATIONS_ROOM_ROUTE}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForSelector("[data-imros-operations-room]", { timeout: 30000 });
  await page.waitForSelector("[data-public-system-status]", { timeout: 30000 });
  await page.waitForTimeout(400);
  mkdirSync(".qc-runtime", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: ".qc-runtime/imros-room-desktop.png", fullPage: true });
  const desktop = await overflow(page, 1440, 900);
  await page.setViewportSize({ width: 820, height: 1100 });
  await page.screenshot({ path: ".qc-runtime/imros-room-tablet.png", fullPage: true });
  const tablet = await overflow(page, 820, 1100);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: ".qc-runtime/imros-room-mobile.png", fullPage: true });
  const mobile = await overflow(page, 390, 844);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const snapshot = await page.evaluate(() => {
    const body = document.body.innerText;
    const html = document.documentElement.outerHTML;
    const layouts = {
      desktop: getComputedStyle(document.querySelector('[data-room-layout="desktop"]') as HTMLElement).display,
      tablet: getComputedStyle(document.querySelector('[data-room-layout="tablet"]') as HTMLElement).display,
      mobile: getComputedStyle(document.querySelector('[data-room-layout="mobile"]') as HTMLElement).display,
    };
    const agents = [...document.querySelectorAll("[data-public-agent-id]")].map((node) => ({
      id: node.getAttribute("data-public-agent-id"),
      status: node.getAttribute("data-agent-status"),
      motion: node.getAttribute("data-agent-motion"),
    }));
    const departments = [...document.querySelectorAll("[data-department-id]")].map((node) => ({
      id: node.getAttribute("data-department-id"),
      status: node.getAttribute("data-department-status"),
      motion: node.getAttribute("data-department-motion"),
    }));
    const stats = [...document.querySelectorAll("[data-stat-key]")].map((node) => ({
      key: node.getAttribute("data-stat-key"),
      value: node.getAttribute("data-stat-value"),
      text: node.textContent,
    }));
    return { body, html, layouts, agents, departments, stats };
  });
  const privateRequests = requests.filter((path) =>
    path.startsWith("/api/operator-console") || path.startsWith("/api/runtime") || path.startsWith("/api/hq"),
  );
  const usedPublic = requests.includes(PUBLIC_OPERATIONS_ROOM_ENDPOINT);
  const gate = evaluatePublicOperationsBrowserRuntimeGate({
    overflow: desktop.overflow || tablet.overflow || mobile.overflow,
    consoleErrors,
    privateRequests,
  });
  const payload = {
    href: page.url(),
    usedPublic,
    requests: [...new Set(requests)],
    privateRequests,
    consoleErrors,
    desktop,
    tablet,
    mobile,
    reduced,
    layoutsAtMobile: snapshot.layouts,
    agents: snapshot.agents,
    departments: snapshot.departments,
    stats: snapshot.stats,
    askReview: /AskReview/i.test(snapshot.body) || /AskReview/i.test(snapshot.html),
    occupancy: /OccupancyNPV/i.test(snapshot.body),
    cash: /\$50/.test(snapshot.body) || /\$50/.test(snapshot.html),
    mercury: /Mercury/i.test(snapshot.body),
    candidateIds: /candidate:/.test(snapshot.html),
    idleWorking: snapshot.agents.some((row) => row.status === "IDLE" && row.motion === "working"),
    gate,
  };
  await browser.close();
  writeFileSync(".qc-runtime/imros-live-operations-room-qc.json", `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify(payload, null, 2));
}

void main();
