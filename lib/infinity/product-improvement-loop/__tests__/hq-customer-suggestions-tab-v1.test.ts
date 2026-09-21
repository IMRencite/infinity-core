import { createElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { HQOutputDetail } from "@/components/dashboard/operator-console/artifacts/hq-output-detail";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import type { HQDetailTab, HQEntityDetail } from "@/lib/infinity/operator-console/details/entity-detail-types";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  evaluateFounderFeedbackVisibilityGate,
  filterCustomerSuggestionRows,
  FOUNDER_FEEDBACK_VISIBILITY_GATE,
  ingestCustomerFeedback,
  inspectProductImprovementLoop,
  mutateProductImprovementLoop,
  PRODUCT_IMPROVEMENT_PATH,
  projectVentureCustomerSuggestions,
  recordImprovementOutcome,
  resetProductImprovementLoop,
} from "..";
import {
  evaluateLiveFounderFeedbackVisibilityGate,
  inspectFounderSuggestionsSurface,
} from "../suggestions-qc";

const OTHER_VENTURE = "candidate:cross-venture-suggestions-v1";

function feedback(text: string, extras?: {
  identity?: string;
  synthetic?: boolean;
  venture?: string;
  received_at?: string;
  message_id?: string;
}) {
  return ingestCustomerFeedback({
    venture_id: extras?.venture ?? CRE_VENTURE_ID,
    text,
    contact_identity: extras?.identity ?? "user@example.com",
    channel: "PUBLIC_SITE_FEEDBACK",
    synthetic: extras?.synthetic,
    received_at: extras?.received_at,
    message_id: extras?.message_id,
    force_record: true,
  });
}

function detailWithTabs(tabs: HQDetailTab[]): HQEntityDetail {
  return {
    entityType: "venture_intelligence",
    entityId: CRE_VENTURE_ID,
    title: "OccupancyNPV",
    subtitle: "live",
    concept: "Lease NPV",
    status: "READ-ONLY",
    summary: "read only",
    decision: null,
    decisionWhy: null,
    overview: { sections: [] },
    intelligence: { sections: [] },
    money: { sections: [] },
    insights: { hotTakes: [], metrics: [] },
    evidence: { sections: [] },
    timeline: { phases: [] },
    system: { rows: [] },
    relatedWork: [],
    availableTabs: tabs,
  };
}

function artifact(): HqWorkArtifact {
  return {
    id: "venture-intelligence:test",
    roomId: "intelligence_center",
    artifactType: "venture_intelligence",
    title: "OccupancyNPV",
    subtitle: "live",
    state: "READY",
    createdAt: null,
    sourceRecordType: "canonical_venture",
    sourceRecordId: CRE_VENTURE_ID,
    metadata: { grantsBuild: false, readOnly: true },
    lineageType: "venture",
    lineageId: CRE_VENTURE_ID,
    lineageLabel: "OccupancyNPV",
  };
}

function loadCanonicalDiskState() {
  const parsed = JSON.parse(readFileSync(join(process.cwd(), PRODUCT_IMPROVEMENT_PATH), "utf8")) as ReturnType<typeof inspectProductImprovementLoop>;
  mutateProductImprovementLoop((state) => {
    state.feedback.splice(0, state.feedback.length, ...parsed.feedback);
    state.opportunities.splice(0, state.opportunities.length, ...parsed.opportunities);
    state.outcomes.splice(0, state.outcomes.length, ...(parsed.outcomes ?? []));
    state.learnings.splice(0, state.learnings.length, ...(parsed.learnings ?? []));
    state.incidents.splice(0, state.incidents.length, ...(parsed.incidents ?? []));
  });
}

const VENTURE_TABS: HQDetailTab[] = [
  "intelligence",
  "money",
  "overview",
  "insights",
  "evidence",
  "system",
  "suggestions",
];

describe("HQ VENTURE CUSTOMER SUGGESTIONS TAB V1", () => {
  beforeEach(() => {
    resetProductImprovementLoop();
  });

  it("places Customer Suggestions after System View for every venture intelligence detail", () => {
    const source = readFileSync(join(process.cwd(), "lib/infinity/venture-intelligence/entity-detail.ts"), "utf8");
    expect(source).toContain('"intelligence", "money", "overview", "insights", "evidence", "system", "suggestions"');
    expect(source).toContain('"intelligence", "overview", "insights", "evidence", "system", "suggestions"');
    const html = renderToStaticMarkup(createElement(HQOutputDetail, {
      detail: detailWithTabs(VENTURE_TABS),
      artifact: artifact(),
      embedded: true,
    }));
    expect(html).toContain('data-hq-detail-tab="suggestions"');
    expect(html).toContain(">Customer Suggestions<");
    const systemAt = html.indexOf(">System View<");
    const suggestionsAt = html.indexOf(">Customer Suggestions<");
    expect(systemAt).toBeGreaterThan(-1);
    expect(suggestionsAt).toBeGreaterThan(systemAt);
    const surface = inspectFounderSuggestionsSurface();
    expect(surface.suggestions_tab_present).toBe(true);
    expect(surface.suggestions_after_system_view).toBe(true);
    expect(surface.occupancynpv_hardcoded).toBe(false);
  });

  it("A. zero suggestions shows empty projection and empty-state copy", () => {
    const view = projectVentureCustomerSuggestions(CRE_VENTURE_ID);
    expect(view.rows).toEqual([]);
    expect(view.counts).toEqual({
      real: 0,
      synthetic: 0,
      repeated: 0,
      open_opportunities: 0,
      validated: 0,
    });
    const surface = readFileSync(join(process.cwd(), "components/dashboard/operator-console/customer-suggestions-tab.tsx"), "utf8");
    expect(surface).toContain("No customer suggestions have been recorded yet.");
    expect(surface).not.toMatch(/\b(approve|prioritize|delete)\b/i);
    expect(surface).not.toMatch(/method:\s*["']POST["']/);
  });

  it("B. one real suggestion is visible and counted as real", () => {
    const recorded = feedback("Please save my lease comparison so I can return later", {
      identity: "broker@example.com",
      message_id: "real-one",
    });
    expect(recorded.recorded).toBe(true);
    const view = projectVentureCustomerSuggestions(CRE_VENTURE_ID);
    expect(view.counts.real).toBe(1);
    expect(view.counts.synthetic).toBe(0);
    expect(view.rows).toHaveLength(1);
    expect(view.rows[0]?.type).toBe("REAL");
    expect(view.rows[0]?.suggestion).toMatch(/save my lease comparison/i);
    expect(view.rows[0]?.feedback_id).toBe(recorded.feedback?.feedback_id);
  });

  it("C. one synthetic suggestion does not inflate real counts", () => {
    feedback("QC synthetic: keep lease comparison side by side", {
      synthetic: true,
      identity: "occupancynpv-qc-alpha@example.com",
      message_id: "synthetic-one",
    });
    const view = projectVentureCustomerSuggestions(CRE_VENTURE_ID);
    expect(view.counts.synthetic).toBe(1);
    expect(view.counts.real).toBe(0);
    expect(view.counts.repeated).toBe(0);
    expect(view.counts.open_opportunities).toBe(0);
    expect(view.rows[0]?.type).toBe("SYNTHETIC / QC");
    expect(view.rows[0]?.synthetic).toBe(true);
  });

  it("D. mixed real and synthetic stay separated", () => {
    feedback("Please save my lease comparison", { identity: "a@x.com", message_id: "mix-real" });
    feedback("QC synthetic live intake keep comparison", { synthetic: true, identity: "qc@example.com", message_id: "mix-syn" });
    const view = projectVentureCustomerSuggestions(CRE_VENTURE_ID);
    expect(view.counts.real).toBe(1);
    expect(view.counts.synthetic).toBe(1);
    expect(view.rows.filter((row) => row.type === "REAL")).toHaveLength(1);
    expect(view.rows.filter((row) => row.type === "SYNTHETIC / QC")).toHaveLength(1);
    expect(filterCustomerSuggestionRows(view.rows, "real").every((row) => !row.synthetic)).toBe(true);
    expect(filterCustomerSuggestionRows(view.rows, "synthetic").every((row) => row.synthetic)).toBe(true);
  });

  it("E. repeated semantic cluster exposes repeat count", () => {
    feedback("Please save my comparison", { identity: "a@x.com", message_id: "rep-a" });
    feedback("I need to come back to an old lease", { identity: "b@x.com", message_id: "rep-b" });
    const view = projectVentureCustomerSuggestions(CRE_VENTURE_ID);
    expect(view.rows.every((row) => row.repeat_count >= 2)).toBe(true);
    expect(view.counts.repeated).toBeGreaterThanOrEqual(2);
    expect(filterCustomerSuggestionRows(view.rows, "repeated").length).toBeGreaterThanOrEqual(2);
  });

  it("F. linked CanonicalVentureImprovement status and lineage are visible", () => {
    const recorded = feedback("Please add PDF export for the comparison", {
      identity: "c@x.com",
      message_id: "linked-export",
    });
    const view = projectVentureCustomerSuggestions(CRE_VENTURE_ID);
    const row = view.rows[0]!;
    expect(row.feedback_id).toBe(recorded.feedback?.feedback_id);
    expect(row.opportunity_id).toBeTruthy();
    expect(row.improvement_id).toBe(row.opportunity_id);
    expect(row.evidence_lineage.some((item) => item.startsWith("CustomerFeedbackRecord:"))).toBe(true);
    expect(row.evidence_lineage.some((item) => item.startsWith("ProductImprovementOpportunity:"))).toBe(true);
    expect(row.evidence_lineage.some((item) => item.startsWith("CanonicalVentureImprovement:"))).toBe(true);
    recordImprovementOutcome({
      improvement_id: row.improvement_id!,
      expected_outcome: "export works",
      primary_metrics: ["export_success"],
      baseline: { export_success: 0 },
      actual: { export_success: 1 },
      improved: true,
    });
    const validated = projectVentureCustomerSuggestions(CRE_VENTURE_ID);
    expect(validated.rows[0]?.status).toBe("VALIDATED_IMPROVEMENT");
    expect(validated.rows[0]?.lifecycle_state).toBe("Validated");
    expect(validated.counts.validated).toBe(1);
    expect(filterCustomerSuggestionRows(validated.rows, "validated")).toHaveLength(1);
  });

  it("G. newest submission appears first after refresh", () => {
    feedback("Older suggestion please save my comparison", {
      identity: "old@x.com",
      message_id: "old-row",
      received_at: "2026-09-01T00:00:00.000Z",
    });
    feedback("Newest suggestion please add PDF export", {
      identity: "new@x.com",
      message_id: "new-row",
      received_at: "2026-09-12T12:00:00.000Z",
    });
    const view = projectVentureCustomerSuggestions(CRE_VENTURE_ID);
    expect(view.rows[0]?.suggestion).toMatch(/Newest suggestion/i);
    expect(view.rows[1]?.suggestion).toMatch(/Older suggestion/i);
  });

  it("H. FounderFeedbackVisibilityGate fails when canonical feedback exists but the tab is missing", () => {
    feedback("Please save my comparison", { identity: "hidden@x.com", message_id: "hidden-row" });
    const hidden = evaluateFounderFeedbackVisibilityGate({
      canonical_feedback_count: 1,
      availableTabs: ["intelligence", "money", "overview", "insights", "evidence", "system"],
      suggestions_surface_reachable: false,
    });
    expect(hidden.gate).toBe(FOUNDER_FEEDBACK_VISIBILITY_GATE);
    expect(hidden.result).toBe("FAIL");
    expect(hidden.reasons).toContain("CANONICAL_FEEDBACK_HIDDEN_FROM_FOUNDER");

    const live = evaluateLiveFounderFeedbackVisibilityGate(CRE_VENTURE_ID);
    expect(live.result).toBe("PASS");
    expect(inspectFounderSuggestionsSurface().suggestions_surface_reachable).toBe(true);
  });

  it("projects OccupancyNPV canonical records without seeding and stays cross-venture", () => {
    loadCanonicalDiskState();
    const occ = projectVentureCustomerSuggestions(CRE_VENTURE_ID);
    const other = projectVentureCustomerSuggestions(OTHER_VENTURE);
    expect(other.rows).toHaveLength(0);
    expect(occ.rows.length).toBeGreaterThan(0);
    expect(occ.counts.real + occ.counts.synthetic).toBe(occ.rows.length);
    const latest = occ.rows[0]!;
    expect(Date.parse(latest.submitted_at)).toBeGreaterThanOrEqual(
      Math.max(...occ.rows.map((row) => Date.parse(row.submitted_at))),
    );
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toContain(".hq-customer-suggestions");
    expect(css).toContain(".hq-suggestion-table tbody tr.is-selected");
    expect(css).toContain("@media (max-width: 767px)");
    const tab = readFileSync(join(process.cwd(), "components/dashboard/operator-console/customer-suggestions-tab.tsx"), "utf8");
    expect(tab).not.toContain(CRE_VENTURE_ID);
    expect(tab).not.toContain("OccupancyNPV");
  });
});
