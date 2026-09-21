import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { contrastRatio, evaluateRenderedTextVisibilityGate, evaluateTextContrastGate } from "../lib/infinity/organic-growth-engine/obligation/qc-escape-gates";

const URL = "https://occupancynpv.com/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/";
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return "#ffffff";
  return `#${[match[1], match[2], match[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const dir = ".infinity/organic-growth-engine/qc-escape-v2";
  mkdirSync(dir, { recursive: true });
  const viewports: Record<string, unknown> = {};
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const response = await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
    const body = await page.locator("body").innerText();
    const pairs = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll(".pv-eyebrow, .pv-answer-label, .pv-answer, h1, .pv-fin-table th")];
      return nodes.slice(0, 12).map((node) => {
        const style = getComputedStyle(node);
        let bg = style.backgroundColor;
        let parent = node.parentElement;
        while (parent) {
          const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          const opacity = match ? Number(match[4] ?? 1) : 1;
          if (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && opacity >= 0.4) break;
          bg = getComputedStyle(parent).backgroundColor;
          parent = parent.parentElement;
        }
        return {
          name: `${node.className || node.tagName}`,
          color: style.color,
          background: bg,
          opacity: style.opacity,
          height: style.height,
        };
      });
    });
    const contrast = evaluateTextContrastGate(pairs.map((row) => ({
      name: row.name,
      fg: rgbToHex(row.color),
      bg: rgbToHex(row.background),
      ratio: contrastRatio(rgbToHex(row.color), rgbToHex(row.background)),
    })));
    const tableBox = await page.locator(".pv-table-shell").first().boundingBox();
    const tableOverflow = await page.locator(".pv-table-shell").first().evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        client_width: node.clientWidth,
        scroll_width: node.scrollWidth,
        overflow_x: style.overflowX,
      };
    }).catch(() => ({ client_width: 0, scroll_width: 0, overflow_x: "" }));
    const shot = `${dir}/${viewport.name}.png`;
    await page.screenshot({ path: shot, fullPage: true });
    viewports[viewport.name] = {
      status: response?.status() ?? 0,
      title: await page.title(),
      h1: await page.locator("h1").first().innerText().catch(() => ""),
      contrast: contrast.result,
      contrast_reasons: contrast.reasons,
      pairs,
      table_width: tableBox?.width ?? 0,
      overflow: tableOverflow.scroll_width > tableOverflow.client_width + 8 && !/auto|scroll/.test(tableOverflow.overflow_x),
      leaked: /pilot concept|validation \/ pilot|input checklist only|second process explainer/i.test(body),
      checklist: /Quick lease input checklist/i.test(body),
      example: /Worked teaching sample/i.test(body),
      screenshot: shot,
    };
    await page.close();
  }
  await browser.close();
  const visibility = evaluateRenderedTextVisibilityGate({
    light_on_light: Object.values(viewports).some((row) => (row as { contrast: string }).contrast === "FAIL"),
    browser_evidence: true,
  });
  const report = {
    url: URL,
    inspected_at: new Date().toISOString(),
    viewports,
    RenderedTextVisibilityGate: visibility,
    pass: Object.values(viewports).every((row) => {
      const item = row as { status: number; contrast: string; leaked: boolean; overflow: boolean; checklist: boolean };
      return item.status === 200 && item.contrast === "PASS" && !item.leaked && !item.overflow && item.checklist;
    }),
  };
  writeFileSync(`${dir}/browser-proof.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
}

void main();
