import { describe, expect, it } from "vitest";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import {
  evaluateOccupancynpvWorkspaceActionHierarchy,
} from "@/lib/infinity/customer-page-depth/app-action-hierarchy";
import { evaluateOccupancynpvAppActionHierarchyQc } from "@/lib/infinity/venture-operating-scale/occupancynpv-customer-facing-ui-qc";
import {
  evaluateOccupancynpvComposedFaviconGate,
  evaluateVentureFaviconGate,
  factoryFrameworkDefaultIconAllowed,
  factoryMissingFaviconAllowsProductionPass,
  factoryRequiresVentureFavicon,
  VENTURE_FAVICON_GATE,
  VENTURE_FAVICON_PRINCIPLE,
} from "../favicon";
import { FACTORY_INHERITED_QC_CONTRACTS } from "../contract";
import { INHERITED_VISUAL_AND_FAQ_QC_GATES } from "@/lib/infinity/customer-page-depth/factory";
import {
  OCCUPANCYNPV_FAVICON_REPAIR_ID,
  ensureOccupancyNpvCanonicalWork,
  listCanonicalWork,
  resetCanonicalWorkStore,
} from "@/lib/infinity/canonical-work";
import { occupancynpvIco, occupancynpvPng } from "@/lib/infinity/venture-operating-scale/occupancynpv-favicon";

describe("OccupancyNPV favicon production repair v1", () => {
  it("locks the favicon principle and factory inheritance", () => {
    expect(VENTURE_FAVICON_PRINCIPLE).toContain("VENTURE-SPECIFIC FAVICON");
    expect(factoryRequiresVentureFavicon()).toBe(true);
    expect(factoryMissingFaviconAllowsProductionPass()).toBe(false);
    expect(factoryFrameworkDefaultIconAllowed()).toBe(false);
    expect(FACTORY_INHERITED_QC_CONTRACTS).toEqual(expect.arrayContaining([VENTURE_FAVICON_GATE]));
    expect(INHERITED_VISUAL_AND_FAQ_QC_GATES).toEqual(expect.arrayContaining([VENTURE_FAVICON_GATE]));
  });

  it("fails missing, 404, and framework-default icons", () => {
    expect(evaluateVentureFaviconGate({
      venture_id: "occupancynpv",
      files: [{ path: "app/layout.tsx", content: "export const metadata = { title: 'x' };" }],
    }).result).toBe("FAIL");
    expect(evaluateVentureFaviconGate({
      venture_id: "occupancynpv",
      files: [
        { path: "app/icon.png", content: occupancynpvPng(32).toString("base64"), encoding: "base64" },
        { path: "app/layout.tsx", content: "export const metadata = { icons: { icon: '/next.svg' } };" },
      ],
    }).reasons).toEqual(expect.arrayContaining(["FRAMEWORK_DEFAULT_ICON"]));
    expect(evaluateVentureFaviconGate({
      venture_id: "occupancynpv",
      files: composeOccupancynpvPaymentReactivationFiles().files,
      live: { favicon_http: 404, icon_http: 404 },
    }).result).toBe("FAIL");
  });

  it("composes a venture-specific OccupancyNPV icon and metadata", () => {
    const composed = composeOccupancynpvPaymentReactivationFiles();
    const ico = composed.files.find((file) => file.path.replace(/\\/g, "/") === "public/favicon-onpv2.ico");
    const icon = composed.files.find((file) => file.path.replace(/\\/g, "/") === "public/icon.png");
    const apple = composed.files.find((file) => file.path.replace(/\\/g, "/") === "public/apple-touch-icon-onpv2.png");
    const icoRoute = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/favicon.ico/route.ts")?.content ?? "";
    const iconRoute = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/icon/route.ts")?.content ?? "";
    const appleRoute = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/apple-touch-icon.png/route.ts")?.content ?? "";
    const layout = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/layout.tsx")?.content ?? "";
    expect(ico?.encoding).toBe("base64");
    expect(icon?.encoding).toBe("base64");
    expect(apple?.encoding).toBe("base64");
    expect(Buffer.from(ico!.content, "base64")[2]).toBe(1);
    expect(Buffer.from(icon!.content, "base64").subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(icoRoute).toContain("image/x-icon");
    expect(iconRoute).toContain("image/png");
    expect(appleRoute).toContain("image/png");
    expect(layout).toContain("favicon.ico?v=onpv2");
    expect(layout).toContain("/icon?v=onpv2");
    expect(layout).toContain("apple-touch-icon.png?v=onpv2");
    expect(layout).not.toMatch(/next\.svg|vercel\.svg/);
    expect(occupancynpvIco().length).toBeGreaterThan(80);
    expect(evaluateOccupancynpvComposedFaviconGate(composed.files).result).toBe("PASS");
  });

  it("does not regress Compare NPV / View Latest Comparison hierarchy", () => {
    const composed = composeOccupancynpvPaymentReactivationFiles();
    const workspace = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/workspaces/[id]/page.tsx")?.content ?? "";
    const css = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/layout.tsx")?.content ?? "";
    const hierarchy = evaluateOccupancynpvWorkspaceActionHierarchy(workspace, css);
    expect(hierarchy.discoverability.result).toBe("PASS");
    expect(hierarchy.hierarchy.result).toBe("PASS");
    expect(hierarchy.visual.result).toBe("PASS");
    expect(workspace).toContain('data-semantic-role="PRIMARY_EXECUTION"');
    expect(workspace).toContain('data-semantic-role="PRIMARY_CONTINUATION"');
    expect(evaluateOccupancynpvAppActionHierarchyQc().result).toBe("PASS");
  });

  it("records HQ favicon work as completed", () => {
    resetCanonicalWorkStore();
    ensureOccupancyNpvCanonicalWork();
    expect(listCanonicalWork().some((row) => row.work_id === OCCUPANCYNPV_FAVICON_REPAIR_ID && row.status === "COMPLETED")).toBe(true);
  });
});
