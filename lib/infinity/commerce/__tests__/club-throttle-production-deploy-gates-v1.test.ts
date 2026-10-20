import { describe, expect, it, vi } from "vitest";
import { composeClubThrottleStorefrontFiles } from "../club-throttle-storefront-compose";
import { evaluateClubThrottleProductionDeployGates } from "../club-throttle-production-deploy-gates-v1";
import { runClubThrottleProductionDeploymentForTest } from "../club-throttle-production-deployment-runner";
import type { RenderedCapabilitySample } from "@/lib/infinity/organic-growth-engine/continuous/public-page-capability-contract-v1";

function desktopCapabilitySamples(presentSidebar: boolean): RenderedCapabilitySample[] {
  const sidebar: RenderedCapabilitySample = {
    capability_id: "BLOG_SIDEBAR",
    dom_present: presentSidebar,
    visible: presentSidebar,
    width_px: presentSidebar ? 220 : 0,
    height_px: presentSidebar ? 480 : 0,
  };
  const base = (id: RenderedCapabilitySample["capability_id"], ok = true): RenderedCapabilitySample => ({
    capability_id: id,
    dom_present: ok,
    visible: ok,
    width_px: ok ? 400 : 0,
    height_px: ok ? 120 : 0,
  });
  return [
    base("BLOG_INDEX_HEADING"),
    base("BLOG_ARTICLE_INVENTORY"),
    base("BLOG_ARTICLE_CARDS"),
    base("BLOG_FEATURED_MEDIA"),
    base("BLOG_CATEGORY_DISCOVERY"),
    base("BLOG_TOPIC_DISCOVERY"),
    sidebar,
    base("BLOG_POPULAR_RESOURCES"),
    base("BLOG_LATEST_POSTS"),
    base("BLOG_INTERNAL_LINKS"),
  ];
}

function createMockVercel() {
  const calls = {
    createProject: 0,
    upload: 0,
    createDeployment: 0,
    alias: 0,
    promote: 0,
  };
  const adapter = {
    tokenPresent: () => false,
    createProject: vi.fn(async () => {
      calls.createProject += 1;
      return { ok: true, id: "prj_mock", reused: false, safeError: null };
    }),
    uploadSourceFile: vi.fn(async () => {
      calls.upload += 1;
      return { ok: true, safeError: null };
    }),
    createSourceBundleDeployment: vi.fn(async () => {
      calls.createDeployment += 1;
      return { ok: true, id: "dpl_mock", url: "https://mock.vercel.app", safeError: null };
    }),
    assignDeploymentAlias: vi.fn(async () => {
      calls.alias += 1;
      return { ok: true, safeError: null };
    }),
    promoteDeployment: vi.fn(async () => {
      calls.promote += 1;
      return { ok: true, safeError: null };
    }),
    getDeployment: vi.fn(async () => ({ readyState: "READY", url: "https://mock.vercel.app", ok: true, safeError: null })),
    getAlias: vi.fn(async () => ({ deploymentId: "NONE", ok: true, safeError: null })),
    getProject: vi.fn(async () => ({ productionDeploymentId: "NONE", ok: true, safeError: null })),
  };
  return { adapter, calls };
}

describe("CT deploy capability enforcement", () => {
  it("CT_DEPLOY_MISSING_SIDEBAR_REGRESSION_QC rejects sidebar-absent compose via deploy path", async () => {
    const composed = composeClubThrottleStorefrontFiles();
    const journalIdx = composed.files.findIndex((file) => file.path === "app/journal/page.tsx");
    expect(journalIdx).toBeGreaterThanOrEqual(0);
    const strippedJournal = composed.files[journalIdx]!.content!.replace(/<aside[\s\S]*?<\/aside>/, "");
    composed.files[journalIdx] = { ...composed.files[journalIdx]!, content: strippedJournal };

    const gateOnly = evaluateClubThrottleProductionDeployGates({
      composed,
      capability_boundary: "UNIT_HELPER",
    });
    expect(gateOnly.CT_DEPLOY_CAPABILITY_ENFORCEMENT_QC).toBe("FAIL");
    expect(gateOnly.stable_reason).toBe("CT_PUBLIC_UI_CAPABILITY_QC_FAIL");

    const { adapter, calls } = createMockVercel();
    const deploy = await runClubThrottleProductionDeploymentForTest({
      deploy: true,
      persistEvidence: false,
      composed_override: composed,
      capability_boundary: "UNIT_HELPER",
      skip_backlog_deploy_guard: true,
      skip_production_env_bootstrap: true,
      vercel_adapter: adapter as never,
    });
    expect(deploy.deployed).toBe(false);
    expect(deploy.safeError).toMatch(/CT_PUBLIC_UI_CAPABILITY_QC_FAIL/);
    expect(calls.createProject).toBe(0);
    expect(calls.upload).toBe(0);
    expect(calls.createDeployment).toBe(0);
    expect(calls.alias).toBe(0);
    expect(calls.promote).toBe(0);
  });

  it("CT_DEPLOY_PREMUTATION_BLOCKING_REGRESSION_QC blocks Vercel mutation on capability fail", async () => {
    const composed = composeClubThrottleStorefrontFiles();
    const journalIdx = composed.files.findIndex((file) => file.path === "app/journal/page.tsx");
    composed.files[journalIdx] = {
      ...composed.files[journalIdx]!,
      content: composed.files[journalIdx]!.content!.replace(/<aside[\s\S]*?<\/aside>/, ""),
    };
    const { adapter, calls } = createMockVercel();
    await runClubThrottleProductionDeploymentForTest({
      deploy: true,
      composed_override: composed,
      capability_boundary: "UNIT_HELPER",
      skip_backlog_deploy_guard: true,
      skip_production_env_bootstrap: true,
      vercel_adapter: adapter as never,
    });
    expect(calls.createProject).toBe(0);
    expect(calls.upload).toBe(0);
    expect(calls.createDeployment).toBe(0);
    expect(calls.alias).toBe(0);
    expect(calls.promote).toBe(0);
  });

  it("CT_DEPLOY_CAPABILITY_ENFORCEMENT_QC passes composed journal with browser evidence", () => {
    const composed = composeClubThrottleStorefrontFiles();
    const journal = composed.files.find((file) => file.path === "app/journal/page.tsx")?.content ?? "";
    const browser = {
      desktop: { viewport: "desktop" as const, capabilities: desktopCapabilitySamples(true) },
      tablet: { viewport: "tablet" as const, capabilities: desktopCapabilitySamples(true) },
      mobile: { viewport: "mobile" as const, capabilities: desktopCapabilitySamples(true) },
    };
    const gate = evaluateClubThrottleProductionDeployGates({
      composed,
      browser_capability_evidence: browser,
      capability_boundary: "PRODUCTION_DEPLOY",
    });
    expect(gate.CT_DEPLOY_CAPABILITY_ENFORCEMENT_QC).toBe("PASS");
    expect(journal).toContain('data-blog-sidebar="true"');
  });

  it("PRODUCTION_DEPLOY boundary fails closed without browser capability evidence", () => {
    const composed = composeClubThrottleStorefrontFiles();
    const gate = evaluateClubThrottleProductionDeployGates({
      composed,
      capability_boundary: "PRODUCTION_DEPLOY",
    });
    expect(gate.CT_DEPLOY_CAPABILITY_ENFORCEMENT_QC).toBe("FAIL");
    expect(gate.reasons.some((r) => r.includes("FAIL_EVIDENCE_MISSING"))).toBe(true);
  });
});
