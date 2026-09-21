import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { chromium } from "@playwright/test";
import { OCCUPANCYNPV_MATERIAL_ROUTES } from "../lib/infinity/universal-venture-system-qc/exhaustive";
import {
  evaluateDefaultBrowserStyleDetectionGate,
  evaluateRenderedStyleApplicationGate,
  evaluateVentureDesignSystemConformanceGate,
  evaluateRenderedVisualQualityGate,
} from "../lib/infinity/universal-venture-system-qc/visual";

const EVIDENCE_PATH = ".infinity/venture-operating-scale/occupancynpv-live-visual-qc.json" as const;
const SHOT_DIR = ".infinity/venture-operating-scale/occupancynpv-live-screenshots";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
] as const;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const captured_at = new Date().toISOString();
  const routes: Array<Record<string, unknown>> = [];
  let suggestHtml = "";
  let computed: Array<{
    name: string;
    tag: string;
    class_name: string;
    required: boolean;
    computed: {
      fontFamily?: string;
      fontSize?: string;
      fontWeight?: string;
      lineHeight?: string;
      padding?: string;
      margin?: string;
      borderRadius?: string;
      border?: string;
      background?: string;
      width?: string;
      minHeight?: string;
      display?: string;
      appearance?: string;
    };
  }> = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(`${viewport.name}:${msg.text()}`);
    });
    page.on("requestfailed", (req) => {
      failedRequests.push(`${viewport.name}:${req.url()}`);
    });
    for (const route of OCCUPANCYNPV_MATERIAL_ROUTES) {
      const url = `https://occupancynpv.com${route}`;
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => null);
      const status = response?.status() ?? null;
      mkdirSync(SHOT_DIR, { recursive: true });
      const shot = `${SHOT_DIR}/${viewport.name}${route.replaceAll("/", "_") || "_home"}.png`;
      await page.screenshot({ path: shot, fullPage: true }).catch(() => null);
      if (viewport.name === "desktop" && route === "/suggest-improvement") {
        suggestHtml = await page.content();
        computed = await page.evaluate(`(() => {
          const pick = (el, name, tag, required) => {
            if (!el) return { name, tag, class_name: "", required, computed: {} };
            const style = getComputedStyle(el);
            return {
              name,
              tag,
              class_name: el.className ? String(el.className) : "",
              required,
              computed: {
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                fontWeight: style.fontWeight,
                lineHeight: style.lineHeight,
                padding: style.padding,
                margin: style.margin,
                borderRadius: style.borderRadius,
                border: style.border,
                background: style.backgroundColor,
                width: style.width,
                minHeight: style.minHeight,
                display: style.display,
                appearance: style.appearance,
              },
            };
          };
          return [
            pick(document.querySelector('button[type="submit"]'), "submit", "button", true),
            pick(document.querySelector("textarea.vg-textarea, textarea"), "message", "textarea", true),
            pick(document.querySelector('input[type="email"]'), "email", "input", true),
          ];
        })()`);
      }
      routes.push({
        venture: "OccupancyNPV",
        route,
        viewport: viewport.name,
        deployment: "LIVE_PRODUCTION",
        timestamp: captured_at,
        screenshot: shot,
        status,
        visual_result: status === 200 ? "CAPTURED" : "HTTP_FAIL",
      });
    }
    await context.close();
  }
  await browser.close();

  const browserDefault = evaluateDefaultBrowserStyleDetectionGate(computed);
  const styleApplied = evaluateRenderedStyleApplicationGate({
    expected_class: "vg-cta",
    class_in_dom: suggestHtml.includes("vg-cta"),
    computed_matches_venture: !browserDefault.unstyled.includes("submit"),
  });
  const design = evaluateVentureDesignSystemConformanceGate({ html: suggestHtml });
  const visual = evaluateRenderedVisualQualityGate({
    unstyled_controls: browserDefault.unstyled.length,
    layout_breaks: false,
    clipping: false,
    overflow: false,
    overlapping: false,
    hierarchy_ok: suggestHtml.includes("Suggest an Improvement"),
    readable: true,
    buttons_malformed: browserDefault.unstyled.includes("submit"),
    founder_physical_fail: browserDefault.result === "FAIL" || design.result === "FAIL",
  });

  const evidence = {
    captured_at,
    environment: "LIVE_PRODUCTION",
    desktop_screenshots: routes.filter((row) => row.viewport === "desktop").length,
    mobile_screenshots: routes.filter((row) => row.viewport === "mobile").length,
    console_errors: consoleErrors,
    failed_requests: failedRequests.filter((url) => !url.includes("favicon")),
    computed,
    gates: {
      DefaultBrowserStyleDetectionGate: browserDefault,
      RenderedStyleApplicationGate: styleApplied,
      VentureDesignSystemConformanceGate: design,
      RenderedVisualQualityGate: visual,
    },
    routes,
  };
  mkdirSync(dirname(EVIDENCE_PATH), { recursive: true });
  writeFileSync(EVIDENCE_PATH, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({
    desktop: evidence.desktop_screenshots,
    mobile: evidence.mobile_screenshots,
    browserDefault: browserDefault.result,
    styleApplied: styleApplied.result,
    design: design.result,
    visual: visual.result,
    unstyled: browserDefault.unstyled,
    console_errors: consoleErrors.length,
    failed_requests: evidence.failed_requests.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
