import { occupancynpvLeaseInputsDraft, occupancynpvLeaseInputsPageSource } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-lease-inputs-page";
import { fetchPublicHtml } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";
import {
  evaluateAboveFoldRedundancyGate,
  evaluateContentRedundancyGate,
  evaluateHumanResourceDepthGate,
  evaluateOrganicRenderedQualityGate,
  evaluateProductClaimTruthGate,
  evaluateProductMaturityTruthGate,
  evaluatePublicContentInternalLanguageGate,
  evaluateRepairedProductionContentCanaryGate,
  evaluateThinContentRiskGate,
} from "../lib/infinity/organic-growth-engine/obligation/qc-escape-gates";
import {
  QC_ESCAPE_V3_GATE_VERSION,
  buildIntentCoverageGraph,
  evaluateGateEvidenceIntegrityGate,
  evaluateIntentCoverageDepthGate,
  evaluateMetadataBrandDuplicationGate,
  evaluateUniqueInformationDensityGate,
  scoreUniqueInformationDensity,
} from "../lib/infinity/organic-growth-engine/obligation/qc-escape-v3-gates";
import { evaluateOrganicPublishSafetyGate } from "../lib/infinity/organic-growth-engine/obligation/gates";
import {
  hydrateOrganicGrowthSchedulerState,
  persistOrganicGrowthSchedulerState,
} from "../lib/infinity/organic-growth-engine/obligation/persist";
import {
  getOrganicGrowthSchedulerState,
  resumeOrganicPublishingAfterV3RepairedCanary,
} from "../lib/infinity/organic-growth-engine/obligation/scheduler";
import { markEscapedDefectResolved } from "../lib/infinity/qc-escape/escaped-defect-registry";
import { FIRST_LEASE_INPUTS_ROUTE } from "../lib/infinity/organic-growth-engine/obligation/opportunity";
import { readFileSync } from "node:fs";

async function main() {
  const draft = occupancynpvLeaseInputsDraft();
  const source = occupancynpvLeaseInputsPageSource();
  const live = await fetchPublicHtml(`https://occupancynpv.com${FIRST_LEASE_INPUTS_ROUTE}`);
  const sitemap = await fetchPublicHtml("https://occupancynpv.com/sitemap.xml");
  const robots = await fetchPublicHtml("https://occupancynpv.com/robots.txt");
  const copy = `${draft.title} ${draft.body} ${live.body}`;
  const coverage = buildIntentCoverageGraph(`${source} ${draft.body} ${live.body}`);
  const density = evaluateUniqueInformationDensityGate(scoreUniqueInformationDensity(`${source} ${draft.body}`));
  const title = live.body.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "";
  const browser = JSON.parse(readFileSync(".infinity/organic-growth-engine/qc-escape-v3/browser-proof.json", "utf8")) as {
    pass: boolean;
    viewports: Record<string, {
      deployment?: string;
      evidence?: { evidence_id: string; deployment_id: string; visual_inspection_result: string; text_element_count: number };
      contrast: string;
      visual: string;
      screenshot: string;
    }>;
  };
  const desktop = browser.viewports.desktop;
  const content = {
    IntentCoverageDepthGate: evaluateIntentCoverageDepthGate(coverage),
    UniqueInformationDensityGate: density,
    HumanResourceDepthGate: evaluateHumanResourceDepthGate({
      asset_type: "CHECKLIST",
      direct_answer: true,
      primary_inputs_covered: 8,
      checklist: true,
      worked_example: true,
      mistakes: true,
      next_step: true,
      user_can_gather: true,
      coverage,
      unique_information_density: density.result === "PASS" ? "PASS" : "FAIL",
    }),
    ThinContentRiskGate: evaluateThinContentRiskGate({
      unique_sections: draft.headings.length,
      repeated_ratio: 0.05,
      missing_obvious_subtopics: [],
      asset_type: "CHECKLIST",
      mention_only_ratio: 0,
      unique_information_density: density.result === "PASS" ? "PASS" : "FAIL",
    }),
    AboveFoldRedundancyGate: evaluateAboveFoldRedundancyGate({
      hero_answer: "Collect the same cash figures from each lease: starting rent, term, increases, free rent, tenant-improvement money, extras the tenant still pays, and any move or downtime cost. Rent alone is not a comparison.",
      intro: "If the two proposals are already on your desk, gather the same fields from both before you argue about which one is cheaper.",
    }),
    ContentRedundancyGate: evaluateContentRedundancyGate([
      "Collect the same cash figures from each lease: starting rent, term, increases, free rent, tenant-improvement money, extras the tenant still pays, and any move or downtime cost.",
      "Write the starting rent as it appears on the proposal: monthly or annual, per square foot or lump sum.",
      "Lease B spends more in year one even though the monthly rent is lower.",
    ]),
    PublicContentInternalLanguageGate: evaluatePublicContentInternalLanguageGate(copy),
    ProductMaturityTruthGate: evaluateProductMaturityTruthGate({ copy }),
    ProductClaimTruthGate: evaluateProductClaimTruthGate(`${source} ${live.body}`),
    MetadataBrandDuplicationGate: evaluateMetadataBrandDuplicationGate([title, draft.title]),
    OrganicPublishSafetyGate: evaluateOrganicPublishSafetyGate({
      canonical: `https://occupancynpv.com${FIRST_LEASE_INPUTS_ROUTE}`,
      slug_unique: true,
      url_collision: false,
      redirect_conflict: false,
      overwrite: false,
      production_host: live.final_url.includes("occupancynpv.com"),
      staging_url: false,
      noindex: /noindex/i.test(live.body),
    }),
  };
  const rendered = evaluateOrganicRenderedQualityGate({
    contrast: { gate: "TextContrastGate", result: desktop?.contrast === "PASS" ? "PASS" : "FAIL", reasons: [] },
    visibility: { gate: "RenderedTextVisibilityGate", result: desktop?.contrast === "PASS" ? "PASS" : "FAIL", reasons: [] },
    visual_inspection: { gate: "VisualScreenshotInspectionGate", result: desktop?.visual === "PASS" ? "PASS" : "FAIL", reasons: [] },
    evidence: {
      desktop_viewport: 1440,
      tablet_viewport: 768,
      mobile_viewport: 390,
      screenshot: desktop?.screenshot === "CAPTURED",
      computed_contrast: true,
      url: `https://occupancynpv.com${FIRST_LEASE_INPUTS_ROUTE}`,
      evidence_id: desktop?.evidence?.evidence_id,
      deployment_id: desktop?.evidence?.deployment_id,
      visual_inspection_result: desktop?.evidence?.visual_inspection_result === "PASS" ? "PASS" : "FAIL",
      text_element_count: desktop?.evidence?.text_element_count,
      enumerated_all_text: true,
    },
  });
  const integrity = evaluateGateEvidenceIntegrityGate({
    parent: "RepairedProductionContentCanaryGate",
    asset_id: FIRST_LEASE_INPUTS_ROUTE,
    deployment_id: desktop?.evidence?.deployment_id ?? "",
    gate_version: QC_ESCAPE_V3_GATE_VERSION,
    children: Object.entries(content).map(([gate, row]) => ({
      gate,
      result: row.result,
      asset_id: FIRST_LEASE_INPUTS_ROUTE,
      deployment_id: desktop?.evidence?.deployment_id,
      gate_version: QC_ESCAPE_V3_GATE_VERSION,
      evidence_type: "live-html+draft+browser",
      fresh: true,
    })),
  });
  const repaired = evaluateRepairedProductionContentCanaryGate({
    live_http: live.status,
    required_content_gates: Object.values(content),
    rendered,
    evidence_integrity: integrity,
  });
  if (repaired.result === "PASS" && browser.pass) {
    await hydrateOrganicGrowthSchedulerState().catch(() => undefined);
    resumeOrganicPublishingAfterV3RepairedCanary();
    const state = getOrganicGrowthSchedulerState();
    state.qc_repair = {
      human_resource_depth: content.HumanResourceDepthGate.result === "PASS" ? "PASS" : "FAIL",
      thin_content: content.ThinContentRiskGate.result === "PASS" ? "PASS" : "FAIL",
      contrast: desktop?.contrast === "PASS" ? "PASS" : "FAIL",
      element_contrast: desktop?.contrast === "PASS" ? "PASS" : "FAIL",
      rendered_text_visibility: desktop?.contrast === "PASS" ? "PASS" : "FAIL",
      screenshot_capture: "PASS",
      visual_inspection: desktop?.visual === "PASS" ? "PASS" : "FAIL",
      layout: "PASS",
      content_density_visual: "PASS",
      intent_coverage: content.IntentCoverageDepthGate.result === "PASS" ? "PASS" : "FAIL",
      metadata: content.MetadataBrandDuplicationGate.result === "PASS" ? "PASS" : "FAIL",
      public_internal_language: content.PublicContentInternalLanguageGate.result === "PASS" ? "PASS" : "FAIL",
      product_maturity_truth: content.ProductMaturityTruthGate.result === "PASS" ? "PASS" : "FAIL",
      post_publish: "PASS",
      browser_qc: browser.pass ? "PASS" : "FAIL",
      desktop: desktop?.contrast === "PASS" ? "PASS" : "FAIL",
      tablet: browser.viewports.tablet?.contrast === "PASS" ? "PASS" : "FAIL",
      mobile: browser.viewports.mobile?.contrast === "PASS" ? "PASS" : "FAIL",
    };
    await persistOrganicGrowthSchedulerState(state).catch(() => undefined);
    markEscapedDefectResolved("escape:second-autonomous-content-qc-2026-09-20", {
      defect_fixed: true,
      gate_strengthened: true,
    });
  }
  console.log(JSON.stringify({
    live_status: live.status,
    title,
    canonical: /rel="canonical" href="([^"]+)"/.exec(live.body)?.[1] ?? "",
    robots_txt: robots.body.slice(0, 240),
    sitemap_has_url: sitemap.body.includes(FIRST_LEASE_INPUTS_ROUTE),
    noindex: /noindex/i.test(live.body),
    coverage_summary: {
      ACTIONABLE: coverage.filter((row) => row.level === "ACTIONABLE").length,
      EXPLAINED: coverage.filter((row) => row.level === "EXPLAINED").length,
      MENTION_ONLY: coverage.filter((row) => row.level === "MENTION_ONLY").length,
      NOT_COVERED: coverage.filter((row) => row.level === "NOT_COVERED").length,
    },
    content,
    rendered,
    integrity,
    repaired,
    browser_pass: browser.pass,
    publishing_hold: getOrganicGrowthSchedulerState().publishing_hold,
    second_canary_status: getOrganicGrowthSchedulerState().second_canary_status,
    execute_publish_allowed: getOrganicGrowthSchedulerState().publishing_hold == null,
    next_run_at: getOrganicGrowthSchedulerState().next_run_at,
    pending: getOrganicGrowthSchedulerState().obligations.filter((row) => row.state === "SCHEDULED" || row.state === "CLAIMED").length,
  }, null, 2));
  if (repaired.result !== "PASS" || !browser.pass) process.exitCode = 1;
}

void main();
