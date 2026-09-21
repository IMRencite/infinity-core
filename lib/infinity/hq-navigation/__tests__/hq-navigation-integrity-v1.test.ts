import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { activeHqNavItems, hqNavItemIsActive } from "../active";
import {
  evaluateHQNavigationIntegrityGate,
  evaluateRenderedHQConsoleQualityGate,
} from "../integrity";
import {
  HQ_KNOWN_APP_ROUTES,
  HQ_NAVIGATION_INTEGRITY_GATE,
  HQ_PRIMARY_NAV_ITEMS,
  RENDERED_HQ_CONSOLE_QUALITY_GATE,
  hqNavReactKey,
  type HqPrimaryNavItem,
} from "../items";

function pagePathForHref(href: string): string {
  return join(process.cwd(), "app", href.replace(/^\//, ""), "page.tsx");
}

describe("HQNavigationIntegrityGate", () => {
  it("passes the catalog: unique semantic IDs, unique visible hrefs, valid routes, unique keys", () => {
    const gate = evaluateHQNavigationIntegrityGate();
    expect(gate.gate).toBe(HQ_NAVIGATION_INTEGRITY_GATE);
    expect(gate.result).toBe("PASS");
    expect(gate.reasons).toEqual([]);

    const ids = HQ_PRIMARY_NAV_ITEMS.map((item) => item.id);
    const keys = HQ_PRIMARY_NAV_ITEMS.map(hqNavReactKey);
    const visibleHrefs = HQ_PRIMARY_NAV_ITEMS.filter((item) => item.visibility === "visible").map((item) => item.href);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(visibleHrefs).size).toBe(visibleHrefs.length);
    expect(keys.every((key) => !/-\d+$/.test(key) || key === "launch_sim")).toBe(true);
    expect(HQ_PRIMARY_NAV_ITEMS.every((item) => hqNavReactKey(item) === item.id)).toBe(true);

    for (const item of HQ_PRIMARY_NAV_ITEMS.filter((row) => row.visibility === "visible" && row.href)) {
      expect(existsSync(pagePathForHref(item.href!)), `missing page for ${item.href}`).toBe(true);
      expect((HQ_KNOWN_APP_ROUTES as readonly string[]).includes(item.href!)).toBe(true);
    }
  });

  it("fails duplicate semantic ID, duplicate React key, accidental duplicate href, and dead routes", () => {
    const runtime: HqPrimaryNavItem = {
      id: "runtime",
      label: "Runtime",
      href: "/dashboard/runtime",
      visibility: "visible",
      purpose: "runtime",
    };
    const missionsAlias: HqPrimaryNavItem = {
      id: "missions",
      label: "Missions",
      href: "/dashboard/runtime",
      visibility: "visible",
      purpose: "missions",
    };
    expect(evaluateHQNavigationIntegrityGate({ items: [runtime, { ...runtime, purpose: "copy" }] }).result).toBe("FAIL");
    expect(evaluateHQNavigationIntegrityGate({ items: [runtime, missionsAlias] }).reasons).toContain("ACCIDENTAL_DUPLICATE_HREF");
    expect(
      evaluateHQNavigationIntegrityGate({
        items: [{ ...runtime, href: "#" }],
      }).reasons.some((reason) => reason.startsWith("DEAD_ROUTE")),
    ).toBe(true);
    expect(
      evaluateHQNavigationIntegrityGate({
        items: [{ ...runtime, href: "/dashboard/does-not-exist" }],
      }).reasons.some((reason) => reason.startsWith("UNKNOWN_ROUTE")),
    ).toBe(true);
  });

  it("allows exactly one active item and fails when two entries match the same page", () => {
    expect(activeHqNavItems("/dashboard/runtime").map((item) => item.id)).toEqual(["runtime"]);
    expect(activeHqNavItems("/dashboard/operations").map((item) => item.id)).toEqual(["operations"]);
    expect(activeHqNavItems("/dashboard/missions").map((item) => item.id)).toEqual(["missions"]);
    expect(activeHqNavItems("/dashboard/missions/msn_1").map((item) => item.id)).toEqual(["missions"]);
    expect(activeHqNavItems("/dashboard").map((item) => item.id)).toEqual(["hq"]);
    expect(activeHqNavItems("/dashboard/ventures").map((item) => item.id)).toEqual(["ventures"]);
    expect(activeHqNavItems("/dashboard/ventures/v1").map((item) => item.id)).toEqual(["ventures"]);
    expect(hqNavItemIsActive("/dashboard/ventures/v1", HQ_PRIMARY_NAV_ITEMS[0]!)).toBe(false);
    expect(evaluateHQNavigationIntegrityGate({ pathname: "/dashboard/runtime" }).result).toBe("PASS");
    expect(evaluateHQNavigationIntegrityGate({ pathname: "/dashboard/missions" }).result).toBe("PASS");

    const colliding: HqPrimaryNavItem[] = [
      { id: "runtime", label: "Runtime", href: "/dashboard/runtime", visibility: "visible", purpose: "runtime" },
      { id: "missions", label: "Missions", href: "/dashboard/runtime", visibility: "visible", purpose: "missions" },
    ];
    const multiple = evaluateHQNavigationIntegrityGate({ items: colliding, pathname: "/dashboard/runtime" });
    expect(multiple.result).toBe("FAIL");
    expect(multiple.reasons.some((reason) => reason.startsWith("MULTIPLE_ACTIVE"))).toBe(true);
  });

  it("fails founder-facing duplicate-key and hydration console errors and ignores extension noise", () => {
    expect(evaluateRenderedHQConsoleQualityGate({ consoleLines: [] }).gate).toBe(RENDERED_HQ_CONSOLE_QUALITY_GATE);
    expect(evaluateRenderedHQConsoleQualityGate({ consoleLines: [] }).result).toBe("PASS");
    expect(
      evaluateRenderedHQConsoleQualityGate({
        consoleLines: ["Encountered two children with the same key, `/dashboard/runtime`."],
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateRenderedHQConsoleQualityGate({
        consoleLines: ["Warning: Hydration failed because the initial UI does not match"],
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateRenderedHQConsoleQualityGate({
        consoleLines: ["chrome-extension://abc/content.js: something noisy"],
      }).result,
    ).toBe("PASS");
  });
});
