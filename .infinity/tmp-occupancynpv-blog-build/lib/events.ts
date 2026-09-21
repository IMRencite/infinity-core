export const EXPERIMENT_EVENT_TYPES = [
  "experiment_view",
  "pricing_view",
  "pricing_option_selected",
  "primary_cta_click",
  "pilot_form_start",
  "pilot_form_submit",
  "qualified_interest",
  "strong_purchase_intent",
] as const;

export type ExperimentEventType = (typeof EXPERIMENT_EVENT_TYPES)[number];

export type ExperimentEvent = {
  type: ExperimentEventType;
  candidateId: "7e7e924e-0741-4155-a729-8d529da77ea9";
  experimentId: string;
  artifactId: string;
  variant: "single_offer";
  occurredAt: string;
  synthetic: boolean;
};

export function eventWeight(type: ExperimentEventType): "WEAK" | "MODERATE" | "STRONG" {
  if (type === "experiment_view" || type === "pricing_view") return "WEAK";
  if (type === "primary_cta_click" || type === "pilot_form_start" || type === "pricing_option_selected") return "MODERATE";
  return "STRONG";
}
