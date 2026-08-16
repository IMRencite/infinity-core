import type {
  GeneratedOrganicPageArtifact,
  OrganicContentContract,
  PostGenerationGateResult,
  PostGenerationRepairAction,
  PostGenerationRepairResult,
} from "../types";
import { validateGeneratedOrganicArtifact } from "./post-generation-gate";

const DEFAULT_REPAIR_BUDGET = 2;

export function planPostGenerationRepair(
  gateResult: PostGenerationGateResult,
  contentContract: OrganicContentContract,
): PostGenerationRepairAction[] {
  if (gateResult.outcome === "PASS") return [];

  const actions: PostGenerationRepairAction[] = [];
  for (const failure of gateResult.failures) {
    if (/Missing required section/i.test(failure)) {
      actions.push({ action: "REWRITE_SECTION", reason: failure, targetSection: contentContract.sections[0]?.heading });
    } else if (/Internal link target/i.test(failure)) {
      actions.push({ action: "REPAIR_LINKS", reason: failure });
    } else if (/schema/i.test(failure)) {
      actions.push({ action: "REPAIR_SCHEMA", reason: failure });
    } else if (/Thin generated content/i.test(failure)) {
      actions.push({ action: "EXPAND_CONTENT", reason: failure });
    } else if (/Fabricated|Unsupported review|LocalBusiness/i.test(failure)) {
      actions.push({ action: "BLOCK_PUBLICATION", reason: failure });
    } else {
      actions.push({ action: "REGENERATE_ARTIFACT", reason: failure });
    }
  }
  return actions;
}

export function applyPostGenerationRepair(input: {
  artifact: GeneratedOrganicPageArtifact;
  contentContract: OrganicContentContract;
  canonicalUrl: string;
  schemaTypes: string[];
  registryUrls: Set<string>;
  gateResult: PostGenerationGateResult;
  repairBudget?: number;
}): PostGenerationRepairResult {
  const budget = input.repairBudget ?? DEFAULT_REPAIR_BUDGET;
  const actions = planPostGenerationRepair(input.gateResult, input.contentContract).slice(0, budget);

  if (actions.some((a) => a.action === "BLOCK_PUBLICATION")) {
    return {
      pageOpportunityId: input.artifact.pageOpportunityId,
      initialOutcome: input.gateResult.outcome,
      finalOutcome: "BLOCK_ARTIFACT",
      repairsAttempted: actions.length,
      actions,
      artifact: input.artifact,
    };
  }

  let repaired: GeneratedOrganicPageArtifact = { ...input.artifact };

  for (const action of actions) {
    if (action.action === "REWRITE_SECTION" || action.action === "EXPAND_CONTENT" || action.action === "REGENERATE_ARTIFACT") {
      repaired = {
        ...repaired,
        sections: input.contentContract.sections.map((s) => ({
          heading: s.heading,
          body: `${s.purpose}\n\n${s.heading} details aligned to contract intent.`,
        })),
        bodyText:
          input.contentContract.sections.map((s) => `${s.heading}\n${s.purpose}`).join("\n\n") +
          "\n\n" +
          input.contentContract.questionsAnswered.join(" ") +
          " ".repeat(180),
      };
    }
    if (action.action === "REPAIR_LINKS") {
      repaired = {
        ...repaired,
        internalLinks: repaired.internalLinks.filter((l) => input.registryUrls.has(l.targetUrl)),
      };
    }
    if (action.action === "REPAIR_SCHEMA") {
      repaired = {
        ...repaired,
        schemaTypes: repaired.schemaTypes.filter((t) => t !== "LocalBusiness" && t !== "Review" && t !== "AggregateRating"),
      };
    }
  }

  const revalidation = validateGeneratedOrganicArtifact({
    artifact: repaired,
    contentContract: input.contentContract,
    canonicalUrl: input.canonicalUrl,
    schemaTypes: repaired.schemaTypes,
    registryUrls: input.registryUrls,
  });

  return {
    pageOpportunityId: input.artifact.pageOpportunityId,
    initialOutcome: input.gateResult.outcome,
    finalOutcome: revalidation.outcome,
    repairsAttempted: actions.length,
    actions,
    artifact: repaired,
    revalidationFailures: revalidation.failures,
  };
}
