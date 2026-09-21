import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  CUSTOMER_JOURNEY_END_TO_END_QC_GATE,
  VENTURE_CUSTOMER_JOURNEY_CONTRACT,
  type NamedSystemGate,
} from "./contract";
import type { VentureCapabilityProfile } from "./inventory";

export type JourneyStep = {
  id: string;
  label: string;
  required: boolean;
};

export type JourneyTransition = {
  from: string;
  to: string;
  works: boolean;
  failure?: string | null;
};

export type VentureCustomerJourney = {
  contract: typeof VENTURE_CUSTOMER_JOURNEY_CONTRACT;
  venture_id: string;
  journey_id: string;
  steps: JourneyStep[];
};

export function deriveCustomerJourney(profile: VentureCapabilityProfile): VentureCustomerJourney {
  const steps: JourneyStep[] = [{ id: "visitor", label: "visitor", required: true }];
  if (profile.public_site) {
    steps.push(
      { id: "homepage", label: "homepage", required: true },
      { id: "product", label: "product", required: true },
    );
    if (profile.paid) steps.push({ id: "pricing", label: "pricing", required: true });
  }
  if (profile.auth) steps.push({ id: "signup_login", label: "signup/login", required: true });
  steps.push({ id: "use_product", label: "use product", required: true });
  if (profile.analytical_results) steps.push({ id: "receive_result", label: "receive result", required: true });
  if (profile.paid) {
    steps.push(
      { id: "purchase", label: "purchase", required: true },
      { id: "fulfillment", label: "fulfillment", required: true },
    );
  }
  if (profile.email_support) steps.push({ id: "support", label: "support", required: false });
  if (profile.customer_facing) steps.push({ id: "suggest_improvement", label: "suggest improvement", required: true });
  return {
    contract: VENTURE_CUSTOMER_JOURNEY_CONTRACT,
    venture_id: profile.venture_id,
    journey_id: `${profile.venture_id}:primary`,
    steps,
  };
}

export function occupancyNpvCustomerJourney(): VentureCustomerJourney {
  return {
    contract: VENTURE_CUSTOMER_JOURNEY_CONTRACT,
    venture_id: CRE_VENTURE_ID,
    journey_id: `${CRE_VENTURE_ID}:primary`,
    steps: [
      { id: "homepage", label: "homepage", required: true },
      { id: "calculator", label: "calculator", required: true },
      { id: "results", label: "results", required: true },
      { id: "pricing", label: "pricing", required: true },
      { id: "checkout", label: "checkout", required: true },
      { id: "return_fulfillment", label: "return/fulfillment", required: true },
      { id: "login_account", label: "login/account", required: true },
      { id: "suggest_improvement", label: "Suggest an Improvement", required: true },
    ],
  };
}

export function evaluateCustomerJourneyEndToEndQCGate(input: {
  journey: VentureCustomerJourney;
  transitions: readonly JourneyTransition[];
}): NamedSystemGate {
  const reasons: string[] = [];
  const required = input.journey.steps.filter((step) => step.required);
  for (let index = 0; index < required.length - 1; index += 1) {
    const from = required[index]!.id;
    const to = required[index + 1]!.id;
    const transition = input.transitions.find((row) => row.from === from && row.to === to);
    if (!transition) {
      reasons.push(`TRANSITION_UNCHECKED:${from}->${to}`);
      continue;
    }
    if (!transition.works) reasons.push(`TRANSITION_FAILED:${from}->${to}:${transition.failure ?? "BROKEN"}`);
  }
  return {
    gate: CUSTOMER_JOURNEY_END_TO_END_QC_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}
