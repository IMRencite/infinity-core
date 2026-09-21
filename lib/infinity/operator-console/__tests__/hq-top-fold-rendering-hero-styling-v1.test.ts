import { createElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InfinityOsHero, HqFoldSkeleton } from "@/components/dashboard/operator-console/infinity-os-hero";
import { HQ_WELCOME_SUBTITLE, HQ_WELCOME_TITLE } from "@/lib/infinity/operator-console/room-naming";

const ROOT = join(process.cwd());

function read(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

describe("HQ TOP FOLD RENDERING + HERO STYLING REPAIR V1", () => {
  it("renders a larger centered Infinity OS hero with subtitle and Ask Infinity below", () => {
    const html = renderToStaticMarkup(
      createElement(InfinityOsHero, null, createElement("input", { placeholder: "Ask Infinity anything..." })),
    );
    expect(html).toContain("hq-os-hero-title");
    expect(html).toContain(HQ_WELCOME_TITLE);
    expect(html).toContain(HQ_WELCOME_SUBTITLE);
    expect(html).toContain("Ask Infinity anything...");
    expect(html.indexOf("hq-os-hero")).toBeLessThan(html.indexOf("ask-infinity"));
    expect(html).not.toMatch(/>rendering/i);
    const css = read("app/globals.css");
    expect(css).toContain("text-align: center");
    expect(css).toContain("clamp(1.7rem, 3.6vw, 2.4rem)");
    expect(css).toContain("text-shadow");
  });

  it("does not use a dominant plain rendering fallback", () => {
    const consoleSource = read("components/dashboard/operator-console/venture-operator-console.tsx");
    const loading = read("app/dashboard/loading.tsx");
    expect(consoleSource).not.toContain("fallback={null}");
    expect(consoleSource).toContain("HqConsolePending");
    expect(consoleSource).toContain("HqFoldSkeleton");
    expect(loading).toContain("InfinityOsHero");
    expect(loading).toContain("HqFoldSkeleton");
    expect(loading).not.toMatch(/rendering/i);
    const skeleton = renderToStaticMarkup(createElement(HqFoldSkeleton));
    expect(skeleton).toContain("data-hq-fold-skeleton");
    expect(skeleton).not.toMatch(/rendering/i);
  });

  it("keeps venture context below HQ Command and Rooms and preserves intelligence mount", () => {
    const consoleSource = read("components/dashboard/operator-console/venture-operator-console.tsx");
    expect(consoleSource.indexOf("<VentureCommandBar")).toBeLessThan(consoleSource.indexOf("<CommandChamber"));
    expect(consoleSource.indexOf("<CommandChamber")).toBeLessThan(consoleSource.indexOf("<HqSpatialFloor"));
    expect(consoleSource.indexOf("<HqSpatialFloor")).toBeLessThan(consoleSource.indexOf("<InspectionContextBar"));
    expect(consoleSource.indexOf("<InspectionContextBar")).toBeLessThan(consoleSource.indexOf("<VentureIntelligencePanel"));
    expect(consoleSource).toContain("<VentureIntelligencePanel");
    expect(read("components/dashboard/operator-console/venture-intelligence-panel.tsx")).toContain("embedded");
    expect(read("app/globals.css")).toContain(".hq-output-detail--embedded");
  });

  it("keeps founder and idle surfaces on the same Infinity OS identity", () => {
    expect(read("components/dashboard/founder-ideas/founder-idea-lab.tsx")).toContain("InfinityOsHero");
    expect(read("components/dashboard/operator-console/hq-idle-shell.tsx")).toContain("InfinityOsHero");
    expect(read("components/dashboard/founder-ideas/founder-idea-lab.tsx")).toContain("embedded");
    expect(read("components/dashboard/operator-console/hq-copilot-dock.tsx")).toContain("hq-os-ask-form");
  });

  it("does not reorder the shell on mobile", () => {
    const hero = read("components/dashboard/operator-console/infinity-os-hero.tsx");
    const consoleSource = read("components/dashboard/operator-console/venture-operator-console.tsx");
    expect(hero).not.toMatch(/md:order-|order-\d/);
    expect(consoleSource).not.toMatch(/md:order-|order-\d/);
  });
});
