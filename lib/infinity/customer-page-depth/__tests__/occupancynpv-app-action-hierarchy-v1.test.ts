import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { evaluateCustomerWorkflowDeadEndGate } from "@/lib/infinity/universal-venture-system-qc/exhaustive";
import { evaluateFounderRenderedUXContradictionGate } from "@/lib/infinity/customer-page-depth/founder-contradiction";
import {
  evaluateOccupancynpvWorkspaceActionHierarchy,
  evaluatePrimaryActionDiscoverabilityGate,
  occupancynpvWorkspaceActionContract,
} from "@/lib/infinity/customer-page-depth/app-action-hierarchy";
import {
  OCCUPANCYNPV_APP_ACTION_HIERARCHY_REPAIR_ID,
  ensureOccupancyNpvCanonicalWork,
  listCanonicalWork,
  resetCanonicalWorkStore,
} from "@/lib/infinity/canonical-work";
import { INHERITED_VISUAL_AND_FAQ_QC_GATES, planCustomerPageDepthBeforeBuild } from "@/lib/infinity/customer-page-depth/factory";
import { FACTORY_INHERITED_QC_CONTRACTS } from "@/lib/infinity/universal-venture-system-qc/contract";
import { APPLICATION_INTERFACE_FULL_QC_GATES } from "@/lib/infinity/customer-page-depth/app-action-hierarchy";
import { evaluateOccupancynpvAppActionHierarchyQc } from "@/lib/infinity/venture-operating-scale/occupancynpv-customer-facing-ui-qc";

function repo(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function composedWorkspace(): { html: string; css: string } {
  const composed = composeOccupancynpvPaymentReactivationFiles();
  return {
    html: composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/workspaces/[id]/page.tsx")?.content ?? "",
    css: composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/layout.tsx")?.content ?? "",
  };
}

const WEAK = `
<form class="onpv-card onpv-compare-panel"><h2>Compare NPV</h2>
<button class="onpv-btn-primary">Compare NPV</button></form>
<p class="onpv-workspace-reopen"><button class="onpv-btn-secondary">View Latest Comparison</button></p>
`;

describe("OccupancyNPV app action hierarchy v1", () => {
  it("classifies Compare NPV as execution and View Latest Comparison as continuation", () => {
    const { html, css } = composedWorkspace();
    const rows = occupancynpvWorkspaceActionContract(html);
    expect(rows.find((row) => row.action_id === "compare-npv")?.semantic_role).toBe("PRIMARY_EXECUTION");
    expect(rows.find((row) => row.action_id === "view-latest-comparison")?.semantic_role).toBe("PRIMARY_CONTINUATION");
    expect(html).toContain('data-semantic-role="PRIMARY_CONTINUATION"');
    expect(html).toContain("onpv-btn-continuation");
    expect(html).toContain('data-result-continuation="true"');
    expect(html).not.toMatch(/onpv-btn-secondary[^>]*>View Latest Comparison/);
    expect(html).not.toContain("onpv-workspace-reopen");
    expect(css).toContain(".onpv-btn-continuation");
    expect(css).toContain("outline: 3px solid");
  });

  it("fails the prior detached secondary treatment and passes the repair", () => {
    const weak = evaluatePrimaryActionDiscoverabilityGate({
      html: WEAK,
      actions: [{
        action_id: "view-latest-comparison",
        label: "View Latest Comparison",
        semantic_role: "PRIMARY_CONTINUATION",
        class_name: "onpv-btn-secondary",
        placement: "detached",
        isolated: true,
        present: true,
        result_access: false,
      }],
      founder_observes_weak_primary: true,
    });
    expect(weak.result).toBe("FAIL");
    const { html, css } = composedWorkspace();
    const repaired = evaluateOccupancynpvWorkspaceActionHierarchy(html, css);
    expect(repaired.discoverability.result).toBe("PASS");
    expect(repaired.hierarchy.result).toBe("PASS");
    expect(repaired.visual.result).toBe("PASS");
  });

  it("fails result workflows when access is obscure", () => {
    expect(evaluateCustomerWorkflowDeadEndGate({
      states: [{ id: "compare", next_required: true, next_present: true }],
      resultAccess: { generated: true, accessPresent: true, accessDiscoverable: false },
    }).result).toBe("FAIL");
    expect(evaluateCustomerWorkflowDeadEndGate({
      states: [
        { id: "compare", next_required: true, next_present: true },
        { id: "view_result", next_required: true, next_present: true },
        { id: "interpret", next_required: true, next_present: true },
      ],
      resultAccess: { generated: true, accessPresent: true, accessDiscoverable: true },
    }).result).toBe("PASS");
  });

  it("lets founder evidence reopen UX gates", () => {
    const prior = evaluateFounderRenderedUXContradictionGate({
      gate: "PrimaryActionDiscoverabilityGate",
      automation_result: "PASS",
      founder_observes_failure: true,
      miss_reason: "RESULT_CONTINUATION_EASY_TO_MISS",
    });
    expect(prior.result).toBe("FAIL");
    expect(prior.automation_is_current_truth).toBe(false);
    expect(prior.reopened_gates).toContain("CustomerWorkflowDeadEndGate");
  });

  it("audits OccupancyNPV authenticated actions without making every button primary", () => {
    const workspace = repo("app/occupancynpv/app/workspaces/[id]/page.tsx");
    const dashboard = repo("app/occupancynpv/app/page.tsx");
    const login = repo("app/occupancynpv/app/login/page.tsx");
    const checkout = repo("app/occupancynpv/app/checkout/complete/page.tsx");
    expect(dashboard).toContain("onpv-btn-primary");
    expect(dashboard).toContain("Create New Deal Workspace");
    expect(dashboard).toContain("Continue workspace");
    expect(dashboard).toMatch(/onpv-btn-secondary[^>]*>[\s\S]*Continue workspace|className="onpv-btn-secondary" href=\{`\/occupancynpv\/app\/workspaces/);
    expect(workspace).toContain("Save Scenario");
    expect(workspace).toContain("onpv-btn-secondary");
    expect(workspace).toContain("Compare NPV");
    expect(workspace).toContain("View Latest Comparison");
    expect(workspace).toContain("data-result-empty");
    expect(login).toContain("onpv-btn-primary");
    expect(checkout).toContain("Sign in to continue");
    expect(checkout).toContain("onpv-btn-primary");
    expect((workspace.match(/onpv-btn-primary/g) ?? []).length).toBeLessThan(4);
  });

  it("inherits action-hierarchy QC for future ventures and records HQ work", () => {
    expect(INHERITED_VISUAL_AND_FAQ_QC_GATES).toEqual(expect.arrayContaining([
      "PrimaryActionDiscoverabilityGate",
      "AppActionHierarchyGate",
      "InteractiveControlVisualHierarchyGate",
      "FounderRenderedUXContradictionGate",
    ]));
    expect(FACTORY_INHERITED_QC_CONTRACTS).toEqual(expect.arrayContaining([
      "PrimaryActionDiscoverabilityGate",
      "AppActionHierarchyGate",
      "InteractiveControlVisualHierarchyGate",
      "CustomerWorkflowDeadEndGate",
    ]));
    expect(planCustomerPageDepthBeforeBuild({ routes: ["/occupancynpv/app/workspaces/:id"] }).inherited_qc_gates)
      .toEqual(expect.arrayContaining(["PrimaryActionDiscoverabilityGate"]));
    expect(APPLICATION_INTERFACE_FULL_QC_GATES).toEqual(expect.arrayContaining([
      "PrimaryActionDiscoverabilityGate",
      "AppActionHierarchyGate",
      "InteractiveControlVisualHierarchyGate",
      "CustomerWorkflowDeadEndGate",
      "ProductUnderstandingGate",
    ]));
    expect(evaluateOccupancynpvAppActionHierarchyQc().result).toBe("PASS");
    resetCanonicalWorkStore();
    ensureOccupancyNpvCanonicalWork();
    expect(listCanonicalWork().some((row) => row.work_id === OCCUPANCYNPV_APP_ACTION_HIERARCHY_REPAIR_ID && row.status === "COMPLETED")).toBe(true);
  });
});
