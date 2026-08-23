import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DepartmentDetailPanel } from "@/components/dashboard/operator-console/department-detail-panel";
import {
  resetSystemsArchitectInspectorScroll,
  SystemsArchitectBlueprint,
  SystemsArchitectDetail,
} from "@/components/dashboard/operator-console/systems-architect-blueprint";
import {
  resolveSystemsArchitectHqView,
  selectSystemsArchitectNode,
  evidenceFromHqSignals,
} from "@/lib/infinity/venture-systems-architecture/hq/hq-view";
import type { OperatorDepartmentSnapshot } from "../types";

const COMPONENTS = join(process.cwd(), "components/dashboard/operator-console");

function namedView() {
  return resolveSystemsArchitectHqView(
    evidenceFromHqSignals({
      ventureType: "saas",
      monetizationModelType: "saas_subscription",
      businessConcept: "B2B SaaS subscription product",
    }),
    {
      entityKind: "VENTURE",
      entityId: "venture-saas",
      entityName: "AI SEO Website Platform",
      entityOrigin: "Opportunity Discovery",
    },
  );
}

function systemsDepartment(view = namedView()): OperatorDepartmentSnapshot {
  return {
    id: "systems_architect",
    label: "Systems Architect",
    displayName: "Systems Architect",
    engines: ["venture_systems_architecture"],
    state: "COMPLETE",
    isActive: false,
    isNextMissionTarget: false,
    summary: view.explanation,
    currentTask: null,
    provider: null,
    model: null,
    costUsd: null,
    costKnown: false,
    startedAt: null,
    lastActivityAt: null,
    recordCount: view.requiredCount,
    failureSemantics: null,
    detail: { systemsArchitectView: view },
    workArtifacts: [],
  };
}

describe("Systems Architect /dashboard interaction path", () => {
  it("opens the architecture workspace from the same console path as /dashboard", () => {
    const consoleSource = readFileSync(join(COMPONENTS, "venture-operator-console.tsx"), "utf8");
    const roomSource = readFileSync(join(COMPONENTS, "department-room.tsx"), "utf8");
    const floorSource = readFileSync(join(COMPONENTS, "hq-spatial-floor.tsx"), "utf8");
    expect(consoleSource).toContain('selectedDepartment === "systems_architect"');
    expect(consoleSource).toContain("data-systems-architect-workspace");
    expect(consoleSource).toContain("SystemsArchitectDetail");
    expect(consoleSource).toContain("architectureWorkspaceOpen");
    expect(consoleSource).toContain("onClose={() => setSelectedDepartment(null)}");
    expect(consoleSource).not.toMatch(/onClose=\{\(\) => \{[\s\S]*onVentureChange/);
    expect(consoleSource).not.toMatch(/onClose=\{\(\) => \{[\s\S]*router\.push/);
    expect(roomSource).toContain("onActivate={onSelect}");
    expect(roomSource).toContain("<SystemsArchitectBlueprint view={systemsView} compact />");
    expect(floorSource).toContain("onSelect={() => onSelectDepartment(deptId)}");
  });

  it("keeps the floor card as a noninteractive preview", () => {
    const html = renderToStaticMarkup(createElement(SystemsArchitectBlueprint, { view: namedView(), compact: true }));
    expect(html).toContain("data-systems-architect-preview=\"true\"");
    expect(html).toContain("data-systems-architect-interactive=\"false\"");
    expect(html).not.toContain("data-node-kind=\"system\"");
    expect(html).toContain("Preview only");
    expect(html).toContain("AI SEO Website Platform");
    expect(html).toContain("data-systems-architect-known-preview=\"true\"");
    expect(html).toContain("Security");
    expect(html).toContain("Compliance");
  });

  it("shows known Security and Compliance on the ambiguous floor card", () => {
    const view = resolveSystemsArchitectHqView(
      {},
      {
        entityKind: "OPPORTUNITY_CANDIDATE",
        entityId: "cand-cre",
        entityName: "Commercial Real Estate (CRE) Lease Comparison & NPV Calculator",
      },
    );
    const html = renderToStaticMarkup(createElement(SystemsArchitectBlueprint, { view, compact: true }));
    expect(html).toContain("Commercial Real Estate (CRE) Lease Comparison");
    expect(html).toContain("Security");
    expect(html).toContain("Compliance");
    expect(html).toContain("Known");
    expect(html).toContain("Unresolved");
    expect(html).not.toContain("data-node-kind=\"system\"");
  });

  it("mounts the dashboard detail component with clickable Security and Compliance buttons", () => {
    const view = namedView();
    const detailHtml = renderToStaticMarkup(createElement(SystemsArchitectDetail, { view }));
    expect(detailHtml).toContain("data-systems-architect-interactive=\"true\"");
    expect(detailHtml).toContain("Operating Blueprint");
    expect(detailHtml).toContain("AI SEO Website Platform");
    expect(detailHtml).toContain("data-family=\"SECURITY_AND_RISK\"");
    expect(detailHtml).toContain(">Security</button>");
    expect(detailHtml).toContain("data-family=\"LEGAL_AND_COMPLIANCE\"");
    expect(detailHtml).toContain(">Compliance</button>");
    expect(detailHtml).toContain("type=\"button\"");
    expect(detailHtml).toContain("aria-pressed");
    expect(detailHtml).toContain("Venture / Opportunity");
    expect(detailHtml).toContain("data-inspector-system");

    const closable = renderToStaticMarkup(
      createElement(SystemsArchitectDetail, { view, onClose: () => undefined }),
    );
    expect(closable).toContain("Back to HQ");
    expect(closable).toContain("data-systems-architect-back=\"true\"");
    expect(closable).toContain("aria-label=\"Back to HQ floor\"");

    const panelHtml = renderToStaticMarkup(
      createElement(DepartmentDetailPanel, {
        department: systemsDepartment(view),
        providers: [],
        workerNodes: [],
        costs: { knownSpendUsd: 0, unpricedProviderCalls: 0, breakdown: [] },
        architectureWorkspaceOpen: false,
      }),
    );
    expect(panelHtml).toContain("data-family=\"SECURITY_AND_RISK\"");
    expect(panelHtml).toContain("Systems Architect");

    const workspaceHtml = renderToStaticMarkup(
      createElement(DepartmentDetailPanel, {
        department: systemsDepartment(view),
        providers: [],
        workerNodes: [],
        costs: { knownSpendUsd: 0, unpricedProviderCalls: 0, breakdown: [] },
        architectureWorkspaceOpen: true,
      }),
    );
    expect(workspaceHtml).toContain("Architecture workspace is open above");
    expect(workspaceHtml).not.toContain("data-family=\"SECURITY_AND_RISK\"");
  });

  it("updates the inspector selection from Security to Compliance using the mounted detail helper", () => {
    const view = namedView();
    const security = selectSystemsArchitectNode(view, "SECURITY_AND_RISK");
    const compliance = selectSystemsArchitectNode(view, "LEGAL_AND_COMPLIANCE");
    expect(security?.family).toBe("SECURITY_AND_RISK");
    expect(security?.label).toBe("Security");
    expect(compliance?.family).toBe("LEGAL_AND_COMPLIANCE");
    expect(compliance?.label).toBe("Compliance");
    expect(security?.id).not.toBe(compliance?.id);
    const source = readFileSync(join(COMPONENTS, "systems-architect-blueprint.tsx"), "utf8");
    expect(source).toContain("selectSystemsArchitectNode(view, selectedId)");
    expect(source).toContain("onSelect={setSelectedId}");
    expect(source).toContain("resetSystemsArchitectInspectorScroll");
    expect(source).toContain("data-inspector-system={node.label}");
    const inspector = { scrollTop: 48 };
    resetSystemsArchitectInspectorScroll(inspector);
    expect(inspector.scrollTop).toBe(0);
  });
});
