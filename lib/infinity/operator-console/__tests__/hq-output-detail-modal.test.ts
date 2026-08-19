import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "components/dashboard/operator-console/artifacts");

function readSource(name: string): string {
  return readFileSync(join(ROOT, name), "utf8");
}

describe("HQ centered holographic detail modal", () => {
  it("uses centered holographic shell instead of edge-docked drawer", () => {
    const source = readSource("hq-output-detail.tsx");
    expect(source).toContain("hq-inspector-hologram");
    expect(source).toContain("hq-hologram-modal");
    expect(source).not.toContain("hq-output-detail-drawer");
    expect(source).not.toMatch(/right-0/);
    expect(source).not.toMatch(/inset-y-0/);
    expect(source).toMatch(/top:\s*50%|hq-inspector-hologram/);
  });

  it("defines centered desktop geometry with visible margins", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/\.hq-inspector-hologram[\s\S]*top:\s*50%/);
    expect(css).toMatch(/left:\s*50%/);
    expect(css).toMatch(/translate\(-50%,\s*-50%\)/);
    expect(css).toMatch(/min\(1120px,\s*calc\(100vw - 96px\)\)/);
    expect(css).toMatch(/min\(820px,\s*calc\(100vh - 96px\)\)/);
    expect(css).not.toContain("hq-output-detail-drawer");
  });

  it("uses dark holographic frame tokens not light admin fallback", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/rgba\(34,\s*211,\s*238/);
    expect(css).toMatch(/rgba\(167,\s*139,\s*250/);
    expect(css).toMatch(/hq-inspector-corner/);
    expect(css).not.toMatch(/hq-output-detail-drawer[\s\S]*#fff/);
  });

  it("preserves modal accessibility and close behavior", () => {
    const shell = readSource("hq-output-detail.tsx");
    const modal = readSource("artifact-inspector-modal.tsx");
    expect(shell).toContain('role="dialog"');
    expect(shell).toContain("aria-modal");
    expect(shell).toContain("Escape");
    expect(shell).toContain("closeButtonRef");
    expect(shell).toContain("triggerRef");
    expect(shell).toContain("document.body.contains(trigger)");
    expect(modal).toContain("HQOutputDetail");
    expect(modal).toContain("closeInspector");
    expect(modal).not.toContain("handleRoomKeyboardActivate");
  });

  it("mobile uses full-screen sheet geometry", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/max-width:\s*768px[\s\S]*100dvh/);
    expect(css).toMatch(/max-width:\s*768px[\s\S]*100vw/);
  });

  it("modal stacks above HQ rooms via z-index", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/hq-inspector-backdrop[\s\S]*z-index:\s*62/);
    expect(css).toMatch(/hq-inspector-hologram[\s\S]*z-index:\s*63/);
  });
});
