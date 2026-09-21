import { writeFile } from "node:fs/promises";

const origin = "https://infinity-validation-cre-lease-npv-e72beb7b-3mxvegjtz.vercel.app";
const { chromium } = await import("@playwright/test");
const browser = await chromium.launch({ headless: true });
const report: Record<string, unknown> = {};
try {
  for (const width of [1440, 1280, 390] as const) {
    const page = await browser.newPage();
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto(`${origin}/how-it-works`, { waitUntil: "networkidle", timeout: 45_000 });
    report[String(width)] = await page.evaluate(`(() => {
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, height: r.height, left: r.left, width: r.width };
      };
      const cs = (el) => {
        if (!el) return null;
        const s = getComputedStyle(el);
        return {
          position: s.position,
          overflow: s.overflow,
          overflowY: s.overflowY,
          zIndex: s.zIndex,
          transform: s.transform,
          marginTop: s.marginTop,
          marginBottom: s.marginBottom,
          paddingBottom: s.paddingBottom,
          minHeight: s.minHeight,
          height: s.height,
          objectFit: s.objectFit,
          objectPosition: s.objectPosition,
        };
      };
      const hero = document.querySelector("header.pv-hero, .pv-hero, .vg-hero");
      const media = document.querySelector(".pv-hero-media, header.pv-hero figure, header.pv-hero img");
      const img = document.querySelector("header.pv-hero img, .pv-hero-media img");
      const overlay = document.querySelector(".pv-hero-overlay");
      const next = hero ? hero.nextElementSibling : null;
      const heading = [...document.querySelectorAll("h2")].find((el) =>
        /Term normalization and cash-flow generation/i.test(el.textContent || ""),
      );
      const firstBody = next ? next.querySelector("h2, p, .pv-prose") : null;
      const heroBox = box(hero);
      const nextBox = box(next);
      const headingBox = box(heading || null);
      const mediaBox = box(media);
      return {
        heroClass: hero ? hero.className : null,
        nextTag: next ? next.tagName : null,
        nextClass: next ? next.className : null,
        hero: heroBox,
        media: mediaBox,
        overlay: box(overlay),
        image: box(img),
        nextSection: nextBox,
        firstBody: box(firstBody),
        termHeading: headingBox,
        heroNextOverlap: heroBox && nextBox ? Math.max(0, heroBox.bottom - nextBox.top) : null,
        mediaNextOverlap: mediaBox && nextBox ? Math.max(0, mediaBox.bottom - nextBox.top) : null,
        mediaHeadingOverlap: mediaBox && headingBox ? Math.max(0, mediaBox.bottom - headingBox.top) : null,
        styles: {
          hero: cs(hero),
          media: cs(media),
          image: cs(img),
          overlay: cs(overlay),
          next: cs(next),
        },
        htmlPreview: hero ? hero.outerHTML.slice(0, 1200) : null,
      };
    })()`);
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(".infinity/how-it-works-hero-geometry.json", `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
