import { describe, expect, it } from "vitest";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { FACTORY_INHERITED_QC_CONTRACTS } from "@/lib/infinity/universal-venture-system-qc/contract";
import { factoryInheritedUniversalVentureSystemQc, factoryMissingLogoOrFaviconAllowsFullPass } from "@/lib/infinity/universal-venture-system-qc/factory";
import { INHERITED_VISUAL_AND_FAQ_QC_GATES } from "@/lib/infinity/customer-page-depth/factory";
import {
  OCCUPANCYNPV_BRAND_IDENTITY_WORK_ID,
  ensureOccupancyNpvCanonicalWork,
  listCanonicalWork,
  resetCanonicalWorkStore,
} from "@/lib/infinity/canonical-work";
import { evaluateOccupancynpvWorkspaceActionHierarchy } from "@/lib/infinity/customer-page-depth/app-action-hierarchy";
import { evaluateOccupancynpvAppActionHierarchyQc } from "@/lib/infinity/venture-operating-scale/occupancynpv-customer-facing-ui-qc";
import {
  BRAND_IDENTITY_DISCOVERABILITY_GATE,
  VENTURE_BRAND_COMPLETENESS_GATE,
  VENTURE_BRAND_CONSISTENCY_GATE,
  VENTURE_BRAND_IDENTITY_CONTRACT,
  VENTURE_BRAND_IDENTITY_PRINCIPLE,
  VENTURE_LOGO_GATE,
  evaluateBrandIdentityDiscoverabilityGate,
  evaluateOccupancynpvBrandIdentityQc,
  evaluateOccupancynpvHqBrandInventory,
  evaluatePublicVentureBrandBundle,
  evaluateVentureLogoGate,
  factoryForcesOneLogoStyleAcrossArchetypes,
  factoryFrameworkDefaultBrandingAllowed,
  factoryMissingFaviconAllowsProductionPass,
  factoryMissingLogoAllowsProductionPass,
  factoryRequiresVentureBrandIdentityContract,
  factoryTextOnlyPlaceholderCountsAsCompleteLogo,
  factoryVentureBrandIdentityPlan,
  futureVenturesInheritBrandQc,
  missingBrandBlocksFullProductionPass,
  occupancynpvBrandIdentityContract,
  occupancynpvCompactMarkSvg,
} from "..";

function composedText(path: string): string {
  return composeOccupancynpvPaymentReactivationFiles().files.find((file) => file.path.replace(/\\/g, "/") === path)?.content ?? "";
}

describe("Global venture brand identity + OccupancyNPV logo/favicon QC v1", () => {
  it("locks the brand identity contract and factory inheritance", () => {
    expect(VENTURE_BRAND_IDENTITY_PRINCIPLE).toContain("VENTURE-SPECIFIC VISUAL IDENTITY");
    expect(factoryRequiresVentureBrandIdentityContract()).toBe(true);
    expect(factoryMissingLogoAllowsProductionPass()).toBe(false);
    expect(factoryMissingFaviconAllowsProductionPass()).toBe(false);
    expect(factoryTextOnlyPlaceholderCountsAsCompleteLogo()).toBe(false);
    expect(factoryFrameworkDefaultBrandingAllowed()).toBe(false);
    expect(factoryForcesOneLogoStyleAcrossArchetypes()).toBe(false);
    expect(futureVenturesInheritBrandQc()).toBe(true);
    expect(factoryMissingLogoOrFaviconAllowsFullPass()).toBe(false);
    expect(FACTORY_INHERITED_QC_CONTRACTS).toEqual(expect.arrayContaining([
      VENTURE_BRAND_IDENTITY_CONTRACT,
      VENTURE_LOGO_GATE,
      "VentureFaviconGate",
      VENTURE_BRAND_CONSISTENCY_GATE,
      VENTURE_BRAND_COMPLETENESS_GATE,
      BRAND_IDENTITY_DISCOVERABILITY_GATE,
    ]));
    expect(INHERITED_VISUAL_AND_FAQ_QC_GATES).toEqual(expect.arrayContaining([
      VENTURE_BRAND_IDENTITY_CONTRACT,
      VENTURE_LOGO_GATE,
      VENTURE_BRAND_CONSISTENCY_GATE,
      VENTURE_BRAND_COMPLETENESS_GATE,
      BRAND_IDENTITY_DISCOVERABILITY_GATE,
    ]));
    expect(factoryInheritedUniversalVentureSystemQc().contracts).toEqual(expect.arrayContaining([
      VENTURE_BRAND_IDENTITY_CONTRACT,
      VENTURE_LOGO_GATE,
    ]));
    const plan = factoryVentureBrandIdentityPlan({
      venture_id: "future-newsletter",
      venture_name: "Signal Weekly",
      archetype: "newsletter",
    });
    expect(plan.required_before_production_pass).toBe(true);
    expect(plan.missing_logo_allows_full_pass).toBe(false);
    expect(plan.missing_favicon_allows_full_pass).toBe(false);
    expect(plan.force_one_logo_style).toBe(false);
    expect(plan.allowed_logo_types).toContain("WORDMARK_ONLY");
    expect(plan.allowed_archetypes).toEqual(expect.arrayContaining(["saas", "ecommerce", "merch", "youtube_channel", "newsletter"]));
  });

  it("fails text-only, missing, generic, and framework-default branding", () => {
    const identity = occupancynpvBrandIdentityContract();
    const textOnly = evaluateVentureLogoGate({
      identity,
      evidence: {
        files: [{ path: "components/site-chrome.tsx", content: '<Link className="pv-nav-brand" href="/">Lease NPV comparison</Link>' }],
        publicHeaderHtml: '<Link className="pv-nav-brand" href="/">Lease NPV comparison</Link>',
        appHeaderHtml: "<a>OccupancyNPV</a>",
      },
    });
    expect(textOnly.result).toBe("FAIL");
    expect(textOnly.reasons).toEqual(expect.arrayContaining(["LOGO_NOT_RENDERED", "TEXT_ONLY_PLACEHOLDER_BRAND"]));

    const missing = evaluatePublicVentureBrandBundle({
      identity: { ...identity, logo_asset: "", logo_mark_asset: "", favicon_asset: "" },
      evidence: {
        files: [{ path: "app/layout.tsx", content: "export const metadata = { title: 'Create Next App' };" }],
        publicHeaderHtml: "Lease NPV comparison",
        metadataTitle: "Create Next App",
      },
    });
    expect(missing.logo.result).toBe("FAIL");
    expect(missing.favicon.result).toBe("FAIL");
    expect(missing.full_pass_allowed).toBe(false);
    expect(missingBrandBlocksFullProductionPass(missing)).toBe(true);

    const framework = evaluateVentureLogoGate({
      identity,
      evidence: {
        files: [{ path: "app/layout.tsx", content: 'icons: { icon: "/next.svg" }' }],
        publicHeaderHtml: '<img src="/vercel.svg" alt="logo" />',
      },
    });
    expect(framework.reasons).toEqual(expect.arrayContaining(["FRAMEWORK_PLACEHOLDER_LOGO"]));

    expect(evaluateBrandIdentityDiscoverabilityGate({
      identity,
      evidence: {
        files: [],
        publicHeaderHtml: '<a href="/">Lease NPV comparison</a>',
      },
    }).result).toBe("FAIL");
  });

  it("creates OccupancyNPV mark + wordmark and composes it on public and app surfaces", () => {
    const identity = occupancynpvBrandIdentityContract();
    expect(identity.venture_name).toBe("OccupancyNPV");
    expect(identity.logo_type).toBe("MARK_PLUS_WORDMARK");
    expect(identity.logo_mark_asset).toContain("#1d4e78");
    expect(identity.logo_mark_asset).toContain("circle");
    expect(identity.logo_mark_asset).not.toMatch(/OccupancyNPV/);
    expect(occupancynpvCompactMarkSvg({ variant: "dark" })).toContain("#ffffff");
    const chrome = composedText("components/site-chrome.tsx");
    const app = composedText("app/occupancynpv/app/layout.tsx");
    const login = composedText("app/occupancynpv/app/login/page.tsx");
    const home = composedText("app/page.tsx");
    const layout = composedText("app/layout.tsx");
    expect(chrome).toContain('data-venture-logo="compact"');
    expect(chrome).toContain('data-venture-wordmark="true"');
    expect(chrome).toContain("OccupancyNPV");
    expect(chrome).not.toMatch(/<Link className="pv-nav-brand" href="\/">Lease NPV comparison<\/Link>/);
    expect(app).toContain('data-venture-logo="compact"');
    expect(app).toContain("OccupancyNPV");
    expect(login).toContain('data-venture-brand="occupancynpv"');
    expect(layout).toContain("OccupancyNPV — Lease NPV comparison");
    expect(layout).toContain("%s · OccupancyNPV");
    expect(home).toContain("OccupancyNPV — Lease NPV comparison");
    expect(layout).toContain("favicon.ico?v=onpv2");
    expect(layout).not.toMatch(/next\.svg|vercel\.svg/);
    const bundle = evaluateOccupancynpvBrandIdentityQc();
    expect(bundle.logo.result).toBe("PASS");
    expect(bundle.favicon.result).toBe("PASS");
    expect(bundle.consistency.result).toBe("PASS");
    expect(bundle.completeness.result).toBe("PASS");
    expect(bundle.discoverability.result).toBe("PASS");
    expect(bundle.full_pass_allowed).toBe(true);
    expect(evaluateOccupancynpvHqBrandInventory()).toEqual({
      brand_identity: "PASS",
      logo: "PASS",
      favicon: "PASS",
      brand_consistency: "PASS",
      metadata_identity: "PASS",
    });
  });

  it("does not regress OccupancyNPV product logic or action hierarchy", () => {
    const composed = composeOccupancynpvPaymentReactivationFiles();
    const pricing = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx")?.content ?? "";
    const workspace = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/workspaces/[id]/page.tsx")?.content ?? "";
    const css = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/layout.tsx")?.content ?? "";
    expect(pricing).toMatch(/\$290/);
    expect(pricing).toMatch(/\$149/);
    expect(pricing).toMatch(/3-day|3 day|Start Free Trial/i);
    expect(workspace).toContain("Compare NPV");
    expect(workspace).toContain("View Latest Comparison");
    expect(evaluateOccupancynpvWorkspaceActionHierarchy(workspace, css).hierarchy.result).toBe("PASS");
    expect(evaluateOccupancynpvAppActionHierarchyQc().result).toBe("PASS");
  });

  it("records HQ brand work as completed", () => {
    resetCanonicalWorkStore();
    ensureOccupancyNpvCanonicalWork();
    expect(listCanonicalWork().some((row) => row.work_id === OCCUPANCYNPV_BRAND_IDENTITY_WORK_ID && row.status === "COMPLETED")).toBe(true);
  });
});
