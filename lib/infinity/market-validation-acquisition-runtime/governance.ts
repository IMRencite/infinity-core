import { EXPLICIT_FOUNDER_COMMUNICATIONS_AUTHORIZATION } from "@/lib/infinity/market-validation-experiment/founder-assisted-cohort";
import { resolvePreparationBlocker } from "./outreach-package";
import { resolveResearchBlocker, type ResearchFailureClass } from "./research-execution";
import type { DiscoveredProspect, FounderGovernanceRequest, NextAcquisitionMission } from "./types";
import type { AcquisitionChannelType } from "./constants";

export function buildNextMission(input: {
  experimentId: string;
  prospectCount: number;
  actionableCount: number;
  topChannel: AcquisitionChannelType;
  blocker?: string;
}): NextAcquisitionMission {
  const ready = input.blocker === "FOUNDER_COMMUNICATIONS_AUTHORIZATION_REQUIRED";
  const providerMissing = input.blocker === "COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED";
  return {
    missionId: `msn_mva_${input.experimentId.replace(/^exp_/, "").slice(0, 16)}`,
    missionType: "MARKET_VALIDATION_ACQUISITION",
    subtype: input.prospectCount > 0 ? "OUTREACH_PREPARATION" : "PROSPECT_DISCOVERY",
    action: ready
      ? `Send ${input.actionableCount} individualized validation messages after founder approval. Do not send before approval.`
      : providerMissing
        ? `Hold ${input.actionableCount} prepared drafts until a verified communication capability exists. Do not send messages.`
        : input.blocker === "ACQUISITION_PREPARATION_INCOMPLETE"
          ? "Continue public contactability research and outreach preparation. Do not send messages."
          : input.blocker === "RESEARCH_EXECUTION_RETRY_REQUIRED"
            ? "Retry bounded public prospect research after transient provider failure. Do not send messages."
            : input.blocker === "PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED"
              ? "Configure a provider-neutral web.search capability. Do not send messages."
              : input.blocker === "NO_QUALIFIED_PUBLIC_PROSPECTS_FOUND"
                ? "Bounded public research found no HIGH-confidence prospects. Do not send messages."
                : "Continue bounded public prospect discovery. Do not send messages.",
    channel: input.prospectCount > 0 ? input.topChannel : "founder_assisted_introduction",
    expectedValidationPurpose:
      "Generate first qualified CRE evidence: role relevance, pricing preference, and pilot interest.",
    externalAction: ready,
    communicationAuthorizationRequired: ready,
    financialAuthorizationRequired: false,
    expectedProviderSpend: "NOT_APPLICABLE",
  };
}

export function buildFounderRequest(input: {
  prospects: DiscoveredProspect[];
  actionable: number;
  blocker: string;
  channelSummary: string;
}): FounderGovernanceRequest {
  const count = input.prospects.length;
  return {
    summary:
      input.blocker === "FOUNDER_COMMUNICATIONS_AUTHORIZATION_REQUIRED"
        ? `Infinity prepared ${input.actionable} high-confidence CRE tenant-rep prospects.`
        : input.blocker === "COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED"
          ? `Infinity prepared ${input.actionable} high-confidence CRE tenant-rep prospects with public contact routes, but no verified send capability exists.`
          : input.blocker === "ACQUISITION_PREPARATION_INCOMPLETE"
            ? `Infinity identified ${count} high-confidence prospects. Public contact channels are still incomplete, so communication authorization is not requested yet.`
            : input.blocker === "RESEARCH_EXECUTION_RETRY_REQUIRED"
              ? "Live research timed out or was rate-limited. Infinity will retry the bounded research path. Founder names are not required yet."
              : "Infinity completed channel analysis. No grounded public prospect identities are available to send yet.",
    recommendedAction:
      input.blocker === "FOUNDER_COMMUNICATIONS_AUTHORIZATION_REQUIRED"
        ? `Send ${input.actionable} individualized validation messages.`
        : input.blocker === "COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED"
          ? "Do not send. A verified communication capability is required before any message can be executed."
          : input.blocker === "RESEARCH_EXECUTION_RETRY_REQUIRED"
            ? "No founder action required. Infinity will retry the bounded research path."
            : "No founder send action is required until an executable communication package exists.",
    purpose: "Test problem relevance, pricing preference, and pilot interest.",
    providerSpend: "NOT_APPLICABLE",
    externalCommunication: "REQUIRES_APPROVAL",
    expectedEvidence: ["problem relevance", "pricing preference", "pilot interest"],
    approveReject: "Approve / Reject",
    prospectCount: count,
  };
}

export function resolveBlocker(input: {
  prospectCount: number;
  capabilityMissing: boolean;
  classification?: ResearchFailureClass | "COMPLETED" | null;
  pathsExhausted?: boolean;
  founderChannelRequired?: boolean;
  searchConfigurationMissing?: boolean;
  actionable?: number;
  drafts?: number;
}): string {
  if (input.prospectCount > 0 || input.actionable || input.drafts) {
    return resolvePreparationBlocker({
      highConfidence: input.prospectCount,
      actionable: input.actionable ?? 0,
      drafts: input.drafts ?? 0,
      pathsExhausted: Boolean(input.pathsExhausted),
      searchConfigurationMissing: Boolean(input.searchConfigurationMissing),
      capabilityMissing: input.capabilityMissing,
      classification: input.classification ?? null,
    });
  }
  return resolveResearchBlocker({
    prospectCount: input.prospectCount,
    capabilityMissing: input.capabilityMissing,
    classification: input.classification ?? null,
    pathsExhausted: Boolean(input.pathsExhausted),
    founderChannelRequired: Boolean(input.founderChannelRequired),
    searchConfigurationMissing: Boolean(input.searchConfigurationMissing),
  });
}

export function founderCommandRequestText(input: {
  actionable: number;
  channelSummary: string;
  blocker: string;
}): string {
  if (input.blocker === "FOUNDER_COMMUNICATIONS_AUTHORIZATION_REQUIRED") {
    return [
      `Infinity prepared ${input.actionable} high-confidence CRE tenant-rep prospects.`,
      "",
      "Recommended action:",
      `Send ${input.actionable} individualized validation messages.`,
      "",
      "Purpose:",
      "Test problem relevance, pricing preference, and pilot interest.",
      "",
      "Channels:",
      input.channelSummary,
      "",
      "Provider spend:",
      "NOT_APPLICABLE",
      "",
      "Communication action:",
      "REQUIRES FOUNDER APPROVAL",
      "",
      "No messages have been sent.",
      "",
      "Approve / Reject.",
    ].join("\n");
  }
  if (input.blocker === "COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED") {
    return [
      `Infinity prepared ${input.actionable} high-confidence CRE tenant-rep prospects.`,
      "",
      "Recommended action:",
      "Do not send. A verified communication capability is required.",
      "",
      "Purpose:",
      "Test problem relevance, pricing preference, and pilot interest.",
      "",
      "Channels:",
      input.channelSummary,
      "",
      "Provider spend:",
      "NOT_APPLICABLE",
      "",
      "Communication action:",
      "BLOCKED — COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED",
      "",
      "No messages have been sent.",
    ].join("\n");
  }
  return "No executable communication package is ready. Infinity is still doing read-only acquisition preparation.";
}

export { EXPLICIT_FOUNDER_COMMUNICATIONS_AUTHORIZATION };
