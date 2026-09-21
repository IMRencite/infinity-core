import { evaluateHubQuestionBoardLayout } from "@/lib/infinity/venture-website-architecture/public-authority-standard/hub-discovery-rendered-quality";
import {
  fullPageAutorepairLiveVerificationPassed,
  verifyFullPageAutorepairLivePublic,
} from "./cre-full-page-autorepair-live-verify";

export const HUB_LAYOUT_REPAIR_LIVE_ROUTES = [
  "/commercial-lease-npv",
  "/lease-comparison",
  "/effective-rent",
  "/occupancy-costs",
  "/lease-sensitivity-analysis",
  "/tenant-rep-analysis",
  "/lease-financial-modeling",
] as const;

const HUB_GEOMETRY_SCRIPT = `(() => {
  const groups = [...document.querySelectorAll("[data-hub-question-discovery] .pv-discovery-grid [data-discovery-group]")];
  const grid = document.querySelector("[data-hub-question-discovery] .pv-discovery-grid");
  const band = document.querySelector("[data-hub-question-discovery] .pv-discovery-band, [data-hub-role-band]");
  const shell = document.querySelector("[data-hub-question-discovery] .vg-container") || document.querySelector("[data-hub-question-discovery]");
  const tops = [...new Set(groups.map((el) => Math.round(el.getBoundingClientRect().top / 8) * 8))];
  const last = tops[tops.length - 1];
  return {
    captured: Boolean(document.querySelector("[data-hub-question-discovery]")),
    viewportWidth: window.innerWidth,
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    containerWidth: shell ? shell.getBoundingClientRect().width : 0,
    gridWidth: grid ? grid.getBoundingClientRect().width : 0,
    gridX: grid ? grid.getBoundingClientRect().left : 0,
    columnCount: groups.filter((el) => Math.abs(el.getBoundingClientRect().top - (groups[0]?.getBoundingClientRect().top ?? 0)) < 12).length,
    lastRowOccupancy: last == null ? 0 : groups.filter((el) => Math.round(el.getBoundingClientRect().top / 8) * 8 === last).length,
    row1: groups.filter((el) => Math.abs(el.getBoundingClientRect().top - (groups[0]?.getBoundingClientRect().top ?? 0)) < 12).length,
    row2: last == null || tops.length < 2 ? 0 : groups.filter((el) => Math.round(el.getBoundingClientRect().top / 8) * 8 === last).length,
    roleBandWidth: band ? band.getBoundingClientRect().width : 0,
    roleBandX: band ? band.getBoundingClientRect().left : 0,
    roleBandY: band ? band.getBoundingClientRect().top : 0,
    groupCount: groups.length + (band ? 1 : 0),
    hasRoleBand: Boolean(band),
  };
})()`;

export async function verifyHubLayoutRepairLivePublic(input: {
  url: string;
  artifactId: string;
  experimentId: string;
  candidateId: string;
  files: Array<{ path: string; content: string; encoding?: string }>;
}) {
  const base = await verifyFullPageAutorepairLivePublic(input);
  const css = input.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const hubs: Array<Record<string, unknown>> = [];
  let missingGeometry = 0;
  let hubFailures = 0;
  let overflow = 0;
  let strayLeftovers = 0;
  let founder: Record<string, unknown> | null = null;
  const byViewport: Record<string, "PASS" | "FAIL"> = {
    "1440": "PASS",
    "1280": "PASS",
    "1024": "PASS",
    "390": "PASS",
  };
  try {
    for (const route of HUB_LAYOUT_REPAIR_LIVE_ROUTES) {
      const viewports =
        route === "/commercial-lease-npv" || route === "/lease-comparison"
          ? [
              { name: "1440", width: 1440 },
              { name: "1280", width: 1280 },
              { name: "1024", width: 1024 },
              { name: "390", width: 390 },
            ]
          : [
              { name: "1280", width: 1280 },
              { name: "390", width: 390 },
            ];
      const routeRows: Record<string, unknown> = { route };
      for (const viewport of viewports) {
        const page = await browser.newPage();
        await page.setViewportSize({ width: viewport.width, height: 900 });
        await page.goto(`${input.url.replace(/\/$/, "")}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
        const html = await page.content();
        const geometry = (await page.evaluate(HUB_GEOMETRY_SCRIPT)) as {
          captured: boolean;
          viewportWidth: number;
          overflowX: number;
          containerWidth: number;
          gridWidth: number;
          gridX: number;
          columnCount: number;
          lastRowOccupancy: number;
          row1: number;
          row2: number;
          roleBandWidth: number;
          roleBandX: number;
          roleBandY: number;
          groupCount: number;
          hasRoleBand: boolean;
        };
        const gate = evaluateHubQuestionBoardLayout({
          html,
          css,
          requireGeometry: true,
          geometry: {
            captured: geometry.captured,
            viewportWidth: viewport.width,
            containerWidth: geometry.containerWidth,
            gridWidth: geometry.gridWidth,
            columnCount: geometry.columnCount,
            lastRowOccupancy: geometry.lastRowOccupancy,
            lastRowGroupCount: geometry.lastRowOccupancy,
            roleBandWidth: geometry.roleBandWidth,
            roleBandX: geometry.roleBandX,
            roleBandY: geometry.roleBandY,
            gridX: geometry.gridX,
            overflowX: geometry.overflowX,
            groupCount: geometry.groupCount,
          },
        });
        if (!geometry.captured) missingGeometry += 1;
        if (geometry.overflowX > 1) overflow += 1;
        if (gate.founderLeftoverPattern) strayLeftovers += 1;
        if (gate.overall === "FAIL" || !geometry.captured) {
          hubFailures += 1;
          byViewport[viewport.name] = "FAIL";
        }
        routeRows[viewport.name] = {
          overall: gate.overall,
          columns: geometry.columnCount,
          row1: geometry.row1,
          row2: geometry.row2,
          role: gate.rolePresentation,
          leftover: gate.founderLeftoverPattern,
          overflow: geometry.overflowX,
          failures: gate.failures,
        };
        if (route === "/commercial-lease-npv" && viewport.name === "1280") {
          founder = {
            route,
            containerWidth: geometry.containerWidth,
            gridWidth: geometry.gridWidth,
            columnCount: geometry.columnCount,
            row1: geometry.row1,
            row2: geometry.row2,
            roleBandWidth: geometry.roleBandWidth,
            roleBandPlacement: geometry.hasRoleBand ? "FULL_WIDTH_BAND" : "GRID_CELL",
            leftover: gate.founderLeftoverPattern ? "PRESENT" : "ABSENT",
            overall: gate.overall,
          };
        }
        await page.close();
      }
      hubs.push(routeRows);
    }
  } finally {
    await browser.close();
  }
  return {
    ...base,
    hubs,
    hubRoutesChecked: HUB_LAYOUT_REPAIR_LIVE_ROUTES.length,
    hubFailures,
    missingHubGeometry: missingGeometry,
    hubOverflow: overflow,
    strayLeftovers,
    responsive: byViewport,
    founder,
  };
}

export function hubLayoutRepairLiveVerificationPassed(
  live: Awaited<ReturnType<typeof verifyHubLayoutRepairLivePublic>>,
): boolean {
  return (
    fullPageAutorepairLiveVerificationPassed(live) &&
    live.hubFailures === 0 &&
    live.missingHubGeometry === 0 &&
    live.hubOverflow === 0 &&
    live.strayLeftovers === 0 &&
    live.hubRoutesChecked === HUB_LAYOUT_REPAIR_LIVE_ROUTES.length &&
    live.founder?.leftover === "ABSENT" &&
    live.founder?.columnCount === 3 &&
    live.founder?.roleBandPlacement === "FULL_WIDTH_BAND"
  );
}
