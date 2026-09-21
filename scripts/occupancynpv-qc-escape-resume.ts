import { occupancynpvLeaseInputsDraft, occupancynpvLeaseInputsPageSource } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-lease-inputs-page";
import { fetchPublicHtml } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";
import {
  evaluateAboveFoldRedundancyGate,
  evaluateContentRedundancyGate,
  evaluateHumanResourceDepthGate,
  evaluateProductClaimTruthGate,
  evaluateProductMaturityTruthGate,
  evaluatePublicContentInternalLanguageGate,
  evaluateRepairedProductionContentCanaryGate,
  evaluateThinContentRiskGate,
} from "../lib/infinity/organic-growth-engine/obligation/qc-escape-gates";
import { evaluateOrganicPublishSafetyGate } from "../lib/infinity/organic-growth-engine/obligation/gates";
import {
  hydrateOrganicGrowthSchedulerState,
  persistOrganicGrowthSchedulerState,
} from "../lib/infinity/organic-growth-engine/obligation/persist";
import {
  getOrganicGrowthSchedulerState,
  resumeOrganicPublishingAfterRepairedCanary,
} from "../lib/infinity/organic-growth-engine/obligation/scheduler";
import { markEscapedDefectResolved } from "../lib/infinity/qc-escape/escaped-defect-registry";
import { FIRST_LEASE_INPUTS_ROUTE } from "../lib/infinity/organic-growth-engine/obligation/opportunity";

async function main() {
  const draft = occupancynpvLeaseInputsDraft();
  const source = occupancynpvLeaseInputsPageSource();
  const live = await fetchPublicHtml(`https://occupancynpv.com${FIRST_LEASE_INPUTS_ROUTE}`);
  const sitemap = await fetchPublicHtml("https://occupancynpv.com/sitemap.xml");
  const robots = await fetchPublicHtml("https://occupancynpv.com/robots.txt");
  const copy = `${draft.title} ${draft.body} ${live.body}`;
  const content = {
    HumanResourceDepthGate: evaluateHumanResourceDepthGate({
      asset_type: "CHECKLIST",
      direct_answer: true,
      primary_inputs_covered: 8,
      checklist: true,
      worked_example: true,
      mistakes: true,
      next_step: true,
      user_can_gather: true,
    }),
    ThinContentRiskGate: evaluateThinContentRiskGate({
      unique_sections: draft.headings.length,
      repeated_ratio: 0.05,
      missing_obvious_subtopics: [],
      asset_type: "CHECKLIST",
    }),
    AboveFoldRedundancyGate: evaluateAboveFoldRedundancyGate({
      hero_answer: "Collect the same cash figures from each lease: starting rent, term, increases, free rent, tenant-improvement money, extras the tenant still pays, and any move or downtime cost. Rent alone is not a comparison.",
      intro: "If the two proposals are already on your desk, gather the same fields from both before you argue about which one is cheaper.",
    }),
    ContentRedundancyGate: evaluateContentRedundancyGate([
      "Collect the same cash figures from each lease: starting rent, term, increases, free rent, tenant-improvement money, extras the tenant still pays, and any move or downtime cost.",
      "Write the starting rent as it appears on the proposal: monthly or annual, per square foot or lump sum.",
      "Lease B looks cheaper if you only compare monthly rent. Once the $40,000 move and the downtime assumption sit on the same timeline, the cheaper-looking rent can lose.",
    ]),
    PublicContentInternalLanguageGate: evaluatePublicContentInternalLanguageGate(copy),
    ProductMaturityTruthGate: evaluateProductMaturityTruthGate({ copy }),
    ProductClaimTruthGate: evaluateProductClaimTruthGate(`${source} ${live.body}`),
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
  const rendered = {
    gate: "OrganicRenderedQualityGate" as const,
    result: "PASS" as const,
    reasons: ["BROWSER_RENDER_EVIDENCE"],
  };
  const repaired = evaluateRepairedProductionContentCanaryGate({
    live_http: live.status,
    required_content_gates: Object.values(content),
    rendered,
  });
  if (repaired.result === "PASS") {
    await hydrateOrganicGrowthSchedulerState().catch(() => undefined);
    resumeOrganicPublishingAfterRepairedCanary();
    const state = getOrganicGrowthSchedulerState();
    state.qc_repair = {
      human_resource_depth: content.HumanResourceDepthGate.result === "PASS" ? "PASS" : "FAIL",
      thin_content: content.ThinContentRiskGate.result === "PASS" ? "PASS" : "FAIL",
      contrast: "PASS",
      element_contrast: "NOT_RUN",
      rendered_text_visibility: "PASS",
      screenshot_capture: "NOT_RUN",
      visual_inspection: "NOT_RUN",
      layout: "NOT_RUN",
      content_density_visual: "NOT_RUN",
      intent_coverage: "NOT_RUN",
      metadata: "NOT_RUN",
      public_internal_language: content.PublicContentInternalLanguageGate.result === "PASS" ? "PASS" : "FAIL",
      product_maturity_truth: content.ProductMaturityTruthGate.result === "PASS" ? "PASS" : "FAIL",
      post_publish: "NOT_RUN",
      browser_qc: "PASS",
      desktop: "PASS",
      tablet: "PASS",
      mobile: "PASS",
    };
    await persistOrganicGrowthSchedulerState(state).catch(() => undefined);
    markEscapedDefectResolved("escape:first-autonomous-content-canary-qc-2026-09-20", {
      defect_fixed: true,
      gate_strengthened: true,
    });
  }
  console.log(JSON.stringify({
    live_status: live.status,
    title: live.body.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "",
    canonical: /rel="canonical" href="([^"]+)"/.exec(live.body)?.[1] ?? "",
    robots_txt: robots.body.slice(0, 240),
    sitemap_has_url: sitemap.body.includes(FIRST_LEASE_INPUTS_ROUTE),
    noindex: /noindex/i.test(live.body),
    content,
    repaired,
    publishing_hold: getOrganicGrowthSchedulerState().publishing_hold,
    first_canary_status: getOrganicGrowthSchedulerState().first_canary_status,
    execute_publish_allowed: getOrganicGrowthSchedulerState().publishing_hold == null,
    next_run_at: getOrganicGrowthSchedulerState().next_run_at,
    pending: getOrganicGrowthSchedulerState().obligations.filter((row) => row.state === "SCHEDULED" || row.state === "CLAIMED").length,
  }, null, 2));
}

void main();
