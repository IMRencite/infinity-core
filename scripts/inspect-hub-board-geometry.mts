import { chromium } from "@playwright/test";
import { evaluateHubQuestionBoardLayout } from "../lib/infinity/venture-website-architecture/public-authority-standard/hub-discovery-rendered-quality.ts";
import {
  FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE,
  GOOD_HUB_DISCOVERY_LAYOUT_FIXTURE,
} from "../lib/infinity/venture-website-architecture/public-authority-standard/hub-discovery-rendered-quality.ts";
import { HUB_DISCOVERY_LAYOUT_CSS } from "../lib/infinity/venture-website-architecture/authority-section-surface-css.ts";
import { reconstructCreHubQuestionBoardLayoutSuccessor } from "../lib/infinity/venture-website-architecture/cre-hub-question-board-layout-successor.ts";
import { pageContent } from "../lib/infinity/venture-website-architecture/answer-authority/page-inspect.ts";

const SCRIPT = `(() => {
  const groups = [...document.querySelectorAll("[data-hub-question-discovery] .pv-discovery-grid [data-discovery-group]")];
  const grid = document.querySelector("[data-hub-question-discovery] .pv-discovery-grid");
  const band = document.querySelector("[data-hub-question-discovery] .pv-discovery-band, [data-hub-role-band]");
  const tops = [...new Set(groups.map((el) => Math.round(el.getBoundingClientRect().top / 8) * 8))];
  const last = tops[tops.length - 1];
  return {
    captured: true,
    viewportWidth: window.innerWidth,
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    columnCount: groups.filter((el) => Math.abs(el.getBoundingClientRect().top - (groups[0]?.getBoundingClientRect().top ?? 0)) < 12).length,
    lastRowOccupancy: last == null ? 0 : groups.filter((el) => Math.round(el.getBoundingClientRect().top / 8) * 8 === last).length,
    gridWidth: grid ? grid.getBoundingClientRect().width : 0,
    gridX: grid ? grid.getBoundingClientRect().left : 0,
    roleBandWidth: band ? band.getBoundingClientRect().width : 0,
    roleBandX: band ? band.getBoundingClientRect().left : 0,
    groupCount: groups.length + (band ? 1 : 0),
  };
})()`;

const browser = await chromium.launch({ headless: true });
const viewports = [1440, 1280, 1024, 390];
const report: Record<string, unknown> = {};

async function measure(name: string, html: string, css: string) {
  const rows: Record<string, unknown> = {};
  for (const width of viewports) {
    const page = await browser.newPage();
    await page.setViewportSize({ width, height: 900 });
    await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>${html.replace(/className=/g, "class=")}</body></html>`, {
      waitUntil: "domcontentloaded",
    });
    const geometry = (await page.evaluate(SCRIPT)) as Parameters<typeof evaluateHubQuestionBoardLayout>[0]["geometry"];
    const gate = evaluateHubQuestionBoardLayout({ html, css, geometry, requireGeometry: true });
    rows[String(width)] = {
      overall: gate.overall,
      columns: geometry?.columnCount,
      lastRow: geometry?.lastRowOccupancy,
      overflow: geometry?.overflowX,
      leftover: gate.founderLeftoverPattern,
      role: gate.rolePresentation,
      failures: gate.failures,
    };
    await page.close();
  }
  report[name] = rows;
}

await measure("founderLeftover", FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE.html, FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE.css);
await measure("repairedFixture", GOOD_HUB_DISCOVERY_LAYOUT_FIXTURE.html, HUB_DISCOVERY_LAYOUT_CSS);
const successor = await reconstructCreHubQuestionBoardLayoutSuccessor();
const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
const founder = pageContent(successor.files, "/commercial-lease-npv");
await measure("successorFounderRoute", founder, css);
await browser.close();
process.stdout.write(`${JSON.stringify({ artifactId: successor.artifactId, digest: successor.digest, hubRoutes: successor.hubRoutes, report }, null, 2)}\n`);
