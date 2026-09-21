import { DEPLOYED_SEO_GEO_SUCCESSOR_URL } from "@/lib/infinity/market-validation-experiment/constants";
import { getActivePublicValidationUrl } from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import { communicationCapabilityForChannel } from "./communication-capabilities";
import type { DiscoveredProspect } from "./types";

export function activeValidationLandingUrl(): string {
  return getActivePublicValidationUrl() ?? DEPLOYED_SEO_GEO_SUCCESSOR_URL;
}

export function prepareFirstTouchValidationContract(prospect: DiscoveredProspect): {
  prospectId: string;
  subject: string;
  body: string;
  landingUrl: string;
  finishedProductClaim: false;
  fabricatedTraction: false;
  fabricatedFamiliarity: false;
  fabricatedUrgency: false;
  fabricatedResults: false;
  pricingSurvey: false;
  groundedPersonalization: true;
  truthfulPersonalization: "PASS" | "FAIL";
  channelCapability: string | null;
  messagesSent: 0;
} {
  const first = prospect.name.split(" ")[0] || prospect.name;
  const role = prospect.publicRole || "tenant representation";
  const landingUrl = activeValidationLandingUrl();
  const body = [
    `Hi ${first} — public materials describe your work in ${role} at ${prospect.organization}.`,
    "I am testing an early validation concept: a focused workflow for comparing commercial lease economics (step-ups, CAM, TI, free rent, NPV). This is not a finished product, and I am not claiming customers, traction, or results.",
    `If that problem is familiar, the early-access page is here: ${landingUrl}`,
    "Would you take a look and say whether this matches lease-comparison work you already do?",
  ].join("\n\n");
  const truthful =
    body.includes(prospect.organization) &&
    /public materials/i.test(body) &&
    !/we already work together|existing customer|limited time|only today/i.test(body);
  return {
    prospectId: prospect.prospectId,
    subject: "Early validation — commercial lease comparison workflow",
    body,
    landingUrl,
    finishedProductClaim: false,
    fabricatedTraction: false,
    fabricatedFamiliarity: false,
    fabricatedUrgency: false,
    fabricatedResults: false,
    pricingSurvey: false,
    groundedPersonalization: true,
    truthfulPersonalization: truthful ? "PASS" : "FAIL",
    channelCapability: communicationCapabilityForChannel(
      prospect.contactability?.status ?? "CONTACT_CHANNEL_NOT_YET_IDENTIFIED",
    ),
    messagesSent: 0,
  };
}
