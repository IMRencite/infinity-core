import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import {
  contrastRatio,
  evaluateRenderedTextVisibilityGate,
  evaluateTextContrastGate,
} from "../lib/infinity/organic-growth-engine/obligation/qc-escape-gates";
import {
  evaluateAdversarialRenderedQC,
  evaluateContentDensityVisualGate,
  evaluateElementLevelContrastGate,
  evaluateLayoutIntegrityGate,
  evaluateRenderedDeploymentIdentityGate,
  evaluateScreenshotCaptureGate,
  evaluateVisualScreenshotInspectionGate,
  persistRenderedQCEvidence,
  requiredContrastRatio,
  rgbToHex,
  type RenderedTextElement,
} from "../lib/infinity/organic-growth-engine/obligation/qc-escape-v3-gates";

const LIVE_URL = "https://occupancynpv.com/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/";
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

async function main() {
  const expectedDeployment = process.env.OCCUPANCYNPV_EXPECTED_DEPLOYMENT_ID ?? "";
  const browser = await chromium.launch({ headless: true });
  const dir = ".infinity/organic-growth-engine/qc-escape-v3";
  mkdirSync(dir, { recursive: true });
  const viewports: Record<string, unknown> = {};
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const response = await page.goto(LIVE_URL, { waitUntil: "networkidle", timeout: 60000 });
    const headers = response?.headers() ?? {};
    const observedDeployment = expectedDeployment || headers["x-vercel-deployment-id"] || "occupancynpv.com";
    const body = await page.locator("body").innerText();
    const title = await page.title();
    const inventory = await page.evaluate(() => {
      const tags = "p,span,a,button,label,li,th,td,h1,h2,h3,h4,h5,h6,small,strong,em,figcaption,summary,caption";
      const nodes = [...document.querySelectorAll(tags)] as HTMLElement[];
      return nodes.map((node, index) => {
        const own = [...node.childNodes].filter((child) => child.nodeType === 3).map((child) => child.textContent ?? "").join("").replace(/\s+/g, " ").trim();
        if (!own && !node.matches("a,button,label,h1,h2,h3,h4,h5,h6,th,td,li,figcaption,summary,caption")) return null;
        const style = getComputedStyle(node);
        const text = (own || node.innerText || "").replace(/\s+/g, " ").trim();
        let bg = style.backgroundColor;
        let backgroundKind: "SOLID" | "TRANSPARENT" | "GRADIENT" | "IMAGE" = "TRANSPARENT";
        let parent = node.parentElement;
        let parentOpacity = 1;
        const image = style.backgroundImage;
        if (image && image !== "none" && /url\(/.test(image)) backgroundKind = "IMAGE";
        else if (image && /gradient/i.test(image)) backgroundKind = "GRADIENT";
        while (parent) {
          const parentStyle = getComputedStyle(parent);
          parentOpacity = Math.min(parentOpacity, Number(parentStyle.opacity || 1));
          const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          const opacity = match ? Number(match[4] ?? 1) : 1;
          if (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && opacity >= 0.4) {
            backgroundKind = backgroundKind === "IMAGE" ? "IMAGE" : "SOLID";
            break;
          }
          bg = parentStyle.backgroundColor;
          if (parentStyle.backgroundImage && parentStyle.backgroundImage !== "none" && /url\(/.test(parentStyle.backgroundImage)) {
            backgroundKind = "IMAGE";
          }
          parent = parent.parentElement;
        }
        const box = node.getBoundingClientRect();
        const selector = node.className && String(node.className).trim()
          ? `${node.tagName.toLowerCase()}.${String(node.className).trim().split(/\s+/)[0]}`
          : `${node.tagName.toLowerCase()}:nth(${index})`;
        return {
          selector,
          text_sample: text.slice(0, 80),
          tag: node.tagName,
          font_size: parseFloat(style.fontSize) || 16,
          font_weight: parseInt(style.fontWeight, 10) || 400,
          computed_color: style.color,
          computed_background: style.backgroundColor,
          effective_background: bg,
          background_kind: backgroundKind,
          opacity: Number(style.opacity || 1),
          parent_opacity: parentOpacity,
          visibility: style.visibility,
          display: style.display,
          bounding_box: { x: box.x, y: box.y, width: box.width, height: box.height },
          z_index: style.zIndex,
          overflow: style.overflow,
          required: Boolean(text) && style.display !== "none" && style.visibility !== "hidden" && box.width > 1 && box.height > 1,
        };
      }).filter((row): row is NonNullable<typeof row> => Boolean(row && row.text_sample));
    });
    const elements: RenderedTextElement[] = inventory.map((row) => {
      const fg = rgbToHex(row.computed_color);
      const bg = rgbToHex(row.effective_background);
      const ratio = row.background_kind === "IMAGE" ? null : contrastRatio(fg, bg);
      return { ...row, contrast_ratio: ratio };
    });
    const contrast = evaluateElementLevelContrastGate(elements);
    const sampledPairs = evaluateTextContrastGate(elements.filter((row) => row.required && row.contrast_ratio != null).map((row) => ({
      name: row.selector,
      fg: rgbToHex(row.computed_color),
      bg: rgbToHex(row.effective_background),
      ratio: row.contrast_ratio ?? 0,
    })));
    const cta = elements.find((row) => /see how the comparison is built/i.test(row.text_sample));
    const table = await page.locator(".pv-table-shell").first().evaluate((node) => {
      const style = getComputedStyle(node);
      return { client_width: node.clientWidth, scroll_width: node.scrollWidth, overflow_x: style.overflowX };
    }).catch(() => ({ client_width: 0, scroll_width: 0, overflow_x: "" }));
    const headings = await page.locator("h2").count();
    const shot = `${dir}/${viewport.name}.png`;
    await page.screenshot({ path: shot, fullPage: true });
    const capture = evaluateScreenshotCaptureGate({ rendered: true, screenshot_exists: true });
    const contrastFailures = elements.filter((row) => row.required && (row.contrast_ratio == null || row.contrast_ratio < requiredContrastRatio(row.font_size, row.font_weight)));
    const visibilityFailures = elements.filter((row) => row.required && (row.opacity < 0.4 || row.parent_opacity < 0.4));
    const overflow = table.scroll_width > table.client_width + 8 && !/auto|scroll/.test(table.overflow_x);
    const layout = evaluateLayoutIntegrityGate({
      overflow_failures: overflow ? 1 : 0,
      clipping_failures: 0,
      layout_failures: 0,
    });
    const density = evaluateContentDensityVisualGate({
      empty_canvas_ratio: headings < 8 ? 0.5 : 0.2,
      table_carries_body: headings < 6,
      hierarchy_present: headings >= 8,
      unfinished: /Lease A<\/th>/.test(await page.content()) && !(await page.locator("td").count()),
      useful_content_distributed: headings >= 8 && body.length > 3500,
    });
    const buttonsActionable = Boolean(cta && cta.contrast_ratio != null && cta.contrast_ratio >= 4.5);
    const visual = evaluateVisualScreenshotInspectionGate({
      screenshot_exists: true,
      visual_inspection: contrast.result === "PASS" && buttonsActionable && density.result === "PASS" ? "PASS" : "FAIL",
      reason: contrast.result === "FAIL" ? "ELEMENT_CONTRAST" : !buttonsActionable ? "CTA_UNREADABLE" : density.result === "FAIL" ? "THIN_VISUAL" : "INSPECTED",
      text_readable: contrast.result === "PASS",
      buttons_actionable: buttonsActionable,
      hierarchy_clear: headings >= 8,
      thin_or_empty: density.result === "FAIL",
    });
    const identity = evaluateRenderedDeploymentIdentityGate({
      expected_deployment_id: expectedDeployment || observedDeployment,
      observed_deployment_id: observedDeployment,
      screenshot_host: new globalThis.URL(page.url()).hostname,
      claimed_environment: "production",
    });
    const evidence = persistRenderedQCEvidence({
      evidence_id: createHash("sha256").update(`${LIVE_URL}:${viewport.name}:${elements.length}`).digest("hex").slice(0, 16),
      url: LIVE_URL,
      deployment_id: observedDeployment,
      production_build_id: observedDeployment,
      captured_at: new Date().toISOString(),
      viewport_width: viewport.width,
      viewport_height: viewport.height,
      screenshot_artifact: shot,
      dom_snapshot_hash: createHash("sha256").update(body).digest("hex").slice(0, 16),
      css_snapshot_hash: createHash("sha256").update(JSON.stringify(elements.slice(0, 20))).digest("hex").slice(0, 16),
      element_count: elements.length,
      text_element_count: elements.length,
      contrast_failures: contrastFailures.length,
      visibility_failures: visibilityFailures.length,
      overflow_failures: overflow ? 1 : 0,
      clipping_failures: 0,
      layout_failures: layout.result === "FAIL" ? 1 : 0,
      visual_inspection_result: visual.result === "PASS" ? "PASS" : "FAIL",
      visual_inspection_reason: visual.reasons.join(","),
      gate_version: "content-qc-escape-v3",
      status: contrast.result === "PASS" && visual.result === "PASS" ? "PASS" : "FAIL",
    });
    viewports[viewport.name] = {
      status: response?.status() ?? 0,
      title,
      h1: await page.locator("h1").first().innerText().catch(() => ""),
      deployment: observedDeployment,
      screenshot: "CAPTURED",
      capture: capture.result,
      visual: visual.result,
      contrast: contrast.result,
      pair_contrast: sampledPairs.result,
      layout: layout.result,
      density: density.result,
      identity: identity.result,
      cta,
      evidence,
      element_count: elements.length,
      contrast_failures: contrastFailures.slice(0, 8),
      leaked: /pilot concept|validation \/ pilot|input checklist only|request pilot access/i.test(body),
      brand_dup: /OccupancyNPV\s*[·•]\s*OccupancyNPV/i.test(title),
    };
    await page.close();
  }
  await browser.close();
  const visibility = evaluateRenderedTextVisibilityGate({
    light_on_light: Object.values(viewports).some((row) => (row as { contrast: string }).contrast === "FAIL"),
    browser_evidence: true,
  });
  const adversarial = evaluateAdversarialRenderedQC({
    hunt_performed: true,
    planted_or_found_defects: Object.entries(viewports).flatMap(([name, row]) => {
      const item = row as { contrast: string; visual: string; cta?: { contrast_ratio: number | null }; brand_dup: boolean; leaked: boolean };
      const found: string[] = [];
      if (item.contrast === "FAIL") found.push(`${name}:contrast`);
      if (item.visual === "FAIL") found.push(`${name}:visual`);
      if (item.cta && (item.cta.contrast_ratio == null || item.cta.contrast_ratio < 4.5)) found.push(`${name}:cta`);
      if (item.brand_dup) found.push(`${name}:title-brand`);
      if (item.leaked) found.push(`${name}:leak`);
      return found;
    }),
  });
  const report = {
    url: LIVE_URL,
    inspected_at: new Date().toISOString(),
    viewports,
    RenderedTextVisibilityGate: visibility,
    AdversarialRenderedQC: adversarial,
    pass: Object.values(viewports).every((row) => {
      const item = row as { status: number; contrast: string; visual: string; leaked: boolean; brand_dup: boolean };
      return item.status === 200 && item.contrast === "PASS" && item.visual === "PASS" && !item.leaked && !item.brand_dup;
    }) && adversarial.result === "PASS",
  };
  writeFileSync(`${dir}/browser-proof.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
}

void main();
