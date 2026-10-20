import { composeClubThrottleStorefrontFiles } from "./club-throttle-storefront-compose";
import { evaluateClubThrottleJournalIndexComposedQc } from "@/lib/infinity/organic-growth-engine/continuous/club-throttle-journal";
import {
  evaluateVentureRequiredCapabilityQc,
  type PublicCapabilityQcBoundary,
  VENTURE_REQUIRED_CAPABILITY_QC,
} from "@/lib/infinity/organic-growth-engine/continuous/public-page-capability-contract-v1";
import type { ResponsiveCapabilityEvidenceV1 } from "@/lib/infinity/organic-growth-engine/continuous/public-page-capability-contract-v1";

export const CT_PUBLIC_UI_CAPABILITY_QC_FAIL = "CT_PUBLIC_UI_CAPABILITY_QC_FAIL" as const;
export const CT_DEPLOY_CAPABILITY_ENFORCEMENT_GATE = "CT_DEPLOY_CAPABILITY_ENFORCEMENT_GATE" as const;

type ComposedStorefront = ReturnType<typeof composeClubThrottleStorefrontFiles>;

export function evaluateClubThrottleProductionDeployGates(input: {
  composed: ComposedStorefront;
  browser_capability_evidence?: ResponsiveCapabilityEvidenceV1 | null;
  capability_boundary?: PublicCapabilityQcBoundary;
}): {
  gate: typeof CT_DEPLOY_CAPABILITY_ENFORCEMENT_GATE;
  result: "PASS" | "FAIL";
  CT_DEPLOY_CAPABILITY_ENFORCEMENT_QC: "PASS" | "FAIL";
  stable_reason: typeof CT_PUBLIC_UI_CAPABILITY_QC_FAIL | null;
  reasons: string[];
  journal_index_qc: ReturnType<typeof evaluateClubThrottleJournalIndexComposedQc>;
  venture_required_capability_qc: ReturnType<typeof evaluateVentureRequiredCapabilityQc>;
} {
  const boundary = input.capability_boundary ?? "PRODUCTION_DEPLOY";
  const journalSource = input.composed.files.find((file) => file.path === "app/journal/page.tsx")?.content ?? "";
  const journalIndexQc = evaluateClubThrottleJournalIndexComposedQc(journalSource);
  const capabilityQc = evaluateVentureRequiredCapabilityQc({
    routes: [
      {
        profile: "BLOG_INDEX",
        html: journalSource,
        browser_capabilities: input.browser_capability_evidence ?? null,
      },
    ],
    boundary,
  });

  const reasons: string[] = [];
  if (journalIndexQc.CT_JOURNAL_SIDEBAR_QC !== "PASS") {
    reasons.push("CT_JOURNAL_SIDEBAR_QC_FAIL");
  }
  if (journalIndexQc.BLOG_INDEX_READINESS.result !== "PASS") {
    reasons.push(...journalIndexQc.BLOG_INDEX_READINESS.reasons.map((r) => `BLOG_INDEX_READINESS:${r}`));
  }
  if (capabilityQc.result !== "PASS") {
    reasons.push(...capabilityQc.reasons.map((r) => `${VENTURE_REQUIRED_CAPABILITY_QC}:${r}`));
  }

  const pass = reasons.length === 0;
  return {
    gate: CT_DEPLOY_CAPABILITY_ENFORCEMENT_GATE,
    result: pass ? "PASS" : "FAIL",
    CT_DEPLOY_CAPABILITY_ENFORCEMENT_QC: pass ? "PASS" : "FAIL",
    stable_reason: pass ? null : CT_PUBLIC_UI_CAPABILITY_QC_FAIL,
    reasons,
    journal_index_qc: journalIndexQc,
    venture_required_capability_qc: capabilityQc,
  };
}
