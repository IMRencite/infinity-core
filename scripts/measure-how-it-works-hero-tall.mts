import { writeFile } from "node:fs/promises";

const origin = "https://infinity-validation-cre-lease-npv-e72beb7b-3mxvegjtz.vercel.app";
const { chromium } = await import("@playwright/test");
const browser = await chromium.launch({ headless: true });
const viewports = [
  { width: 1440, height: 1600 },
  { width: 1280, height: 1400 },
  { width: 1280, height: 900 },
] as const;
const report: Record<string, unknown> = {};
try {
  for (const viewport of viewports) {
    const page = await browser.newPage();
    await page.setViewportSize(viewport);
    await page.goto(`${origin}/how-it-works`, { waitUntil: "networkidle", timeout: 45_000 });
    const key = `${viewport.width}x${viewport.height}`;
    report[key] = await page.evaluate(`(() => {
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, height: r.height, width: r.width };
      };
      const hero = document.querySelector("header.pv-hero");
      const media = document.querySelector(".pv-hero-media");
      const next = hero ? hero.nextElementSibling : null;
      const heading = [...document.querySelectorAll("h2")].find((el) =>
        /Term normalization and cash-flow generation/i.test(el.textContent || ""),
      );
      const heroBox = box(hero);
      const mediaBox = box(media);
      const nextBox = box(next);
      const headingBox = box(heading || null);
      const hit = heading
        ? document.elementsFromPoint(
            heading.getBoundingClientRect().left + 24,
            heading.getBoundingClientRect().top + 12,
          ).map((el) => ({ tag: el.tagName, className: el.className, zIndex: getComputedStyle(el).zIndex }))
        : [];
      return {
        heroClass: hero ? hero.className : null,
        positionedAncestor: (() => {
          let node = media ? media.parentElement : null;
          while (node) {
            const pos = getComputedStyle(node).position;
            if (pos !== "static") return { tag: node.tagName, className: node.className, position: pos };
            node = node.parentElement;
          }
          return "INITIAL_CONTAINING_BLOCK";
        })(),
        hero: heroBox,
        media: mediaBox,
        nextSection: nextBox,
        termHeading: headingBox,
        mediaNextOverlap: mediaBox && nextBox ? Math.max(0, mediaBox.bottom - nextBox.top) : null,
        mediaHeadingOverlap: mediaBox && headingBox ? Math.max(0, mediaBox.bottom - headingBox.top) : null,
        headingUnderMedia: mediaBox && headingBox
          ? headingBox.top < mediaBox.bottom && headingBox.bottom > mediaBox.top
          : false,
        elementsOnHeading: hit,
      };
    })()`);
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(".infinity/how-it-works-hero-tall-geometry.json", `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
