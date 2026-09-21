import type { VentureIntelligenceView } from "@/lib/infinity/venture-intelligence/types";
import {
  compileMonetizationRequirements,
  compileProductRequirementsFromIntelligence,
  compileSystemsRequirements,
  systemsEvidenceFromIntelligence,
} from "./requirements";
import type { CompileInput } from "./types";

function decisionFromView(view: VentureIntelligenceView): string {
  const fromEvidence = view.evidence.summary.find((item) => /\b(BUILD|VALIDATE|HOLD|REJECT|NO_GO)\b/i.test(item));
  const match = fromEvidence?.match(/\b(BUILD|VALIDATE|HOLD|REJECT|NO_GO)\b/i);
  if (match) return match[1]!.toUpperCase();
  if (view.currentPosition.step === "VALIDATE") return "VALIDATE";
  if (view.currentPosition.step === "BUILD") return "BUILD";
  return "VALIDATE";
}

export function compileInputFromIntelligence(
  view: VentureIntelligenceView,
  extras: {
    organizationId: string;
    decision?: string;
    buildReady?: boolean;
    alreadyBuilding?: boolean;
    alreadyBuilt?: boolean;
    policyBlocked?: boolean;
  },
): CompileInput {
  const decision = extras.decision ?? decisionFromView(view);
  const pain = Boolean(view.problem.coreProblem && view.problem.coreProblem.length > 8);
  const competition = Boolean(
    view.marketAdvantage.biggestMarketWeakness &&
      view.marketAdvantage.biggestMarketWeakness !== "Not evidenced yet",
  );
  const research = view.evidence.summary.length > 0 || view.sourceContext.opportunityCandidateId != null;
  const economicsKnown =
    view.economics.ltvCac.origin === "MODELED" ||
    view.economics.ltvCac.origin === "VALIDATED" ||
    view.economics.ltvCac.origin === "OBSERVED";
  return {
    organizationId: extras.organizationId,
    ventureId: view.identity.ventureId,
    candidateId: view.sourceContext.opportunityCandidateId,
    selectionId: view.sourceContext.ventureAssemblyId,
    name: view.identity.name,
    decision,
    buildReady: extras.buildReady ?? false,
    buildReadyReason: view.buildReadinessReason,
    evidence: {
      customerPain: pain,
      competition,
      monetization: Boolean(view.businessModel.summary),
      research,
      missing: [
        ...(!pain ? ["customer_pain"] : []),
        ...(!competition ? ["competition_evidence"] : []),
        ...(!research ? ["research"] : []),
      ],
    },
    economics: {
      known: economicsKnown,
      placeholder: view.economics.economicConfidence === "Weak" && !economicsKnown,
    },
    policyBlocked: extras.policyBlocked ?? false,
    policyReasons: extras.policyBlocked ? ["POLICY_BLOCKED"] : [],
    alreadyBuilding: extras.alreadyBuilding ?? false,
    alreadyBuilt: extras.alreadyBuilt ?? Boolean(view.currentPosition.step === "LAUNCH" && view.performance.available),
    product: compileProductRequirementsFromIntelligence(view),
    systems: compileSystemsRequirements(systemsEvidenceFromIntelligence(view)),
    monetization: compileMonetizationRequirements({
      model: view.businessModel.summary,
      pricing: view.economics.monthlyRevenuePerCustomer.display,
      priceBase: null,
      offer: view.businessModel.summary,
    }),
    organicRequired: view.buildPlan.requiredSystems.some((item) => item.system === "Organic Growth"),
    creativeMediaRequired: view.buildPlan.requiredSystems.some((item) => item.system === "Creative Media"),
    researchIds: [],
    monetizationPlanId: null,
  };
}
