import type { BrainExecutionOutput, SynthesisInput, SynthesisResult } from "./types";

function capabilityWeight(role: BrainExecutionOutput["role"]): number {
  if (role === "synthesizer") return 0;
  if (role === "primary") return 0.35;
  if (role === "specialist") return 0.25;
  if (role === "critic") return 0.2;
  if (role === "reviewer") return 0.15;
  return 0.1;
}

export function synthesizeMultiBrainOutputs(input: SynthesisInput): SynthesisResult {
  const allOutputs = [
    input.primary,
    ...input.specialists,
    ...input.critics,
    ...input.reviewers,
  ].filter((o) => o.success);

  const disagreements: SynthesisResult["disagreements"] = [];
  const criticOutputs = input.critics.filter((c) => c.success);
  const primaryStructured = input.primary.structured ?? {};

  for (const critic of criticOutputs) {
    const criticStructured = critic.structured ?? {};
    if (criticStructured.contradictsPrimary === true) {
      disagreements.push({
        topic: "implementation approach",
        positions: [
          {
            provider: input.primary.provider,
            modelId: input.primary.modelId,
            role: "primary",
            position: input.primary.content,
            confidence: input.primary.confidence,
          },
          {
            provider: critic.provider,
            modelId: critic.modelId,
            role: "critic",
            position: critic.content,
            confidence: critic.confidence,
          },
        ],
        resolution: "Prefer deterministic constraints and critic-identified failure modes in final plan",
      });
    } else if (Array.isArray(criticStructured.risks) && criticStructured.risks.length > 0) {
      disagreements.push({
        topic: "risk assessment",
        positions: [
          {
            provider: input.primary.provider,
            modelId: input.primary.modelId,
            role: "primary",
            position: "Proceed with primary plan",
            confidence: input.primary.confidence,
          },
          {
            provider: critic.provider,
            modelId: critic.modelId,
            role: "critic",
            position: `Risks: ${(criticStructured.risks as string[]).join(", ")}`,
            confidence: critic.confidence,
          },
        ],
        resolution: "Mitigate critic risks while preserving primary architecture direction",
      });
    }
  }

  const weightedConfidence =
    allOutputs.reduce((sum, o) => sum + o.confidence * capabilityWeight(o.role), 0) /
    Math.max(1, allOutputs.reduce((sum, o) => sum + capabilityWeight(o.role), 0));

  const specialistInsights = input.specialists
    .filter((s) => s.success)
    .map((s) => s.content)
    .join(" ");

  const recommendation = [
    input.primary.content,
    specialistInsights,
    criticOutputs.length > 0 ? `Address risks: ${criticOutputs.map((c) => c.content).join("; ")}` : "",
    `Constraints honored: ${input.constraints.join(", ") || "none"}`,
  ]
    .filter(Boolean)
    .join("\n");

  const provenance = allOutputs.map((o) => ({
    provider: o.provider,
    modelId: o.modelId,
    role: o.role,
    weight: capabilityWeight(o.role) * o.confidence,
  }));

  const estimatedTotalCostUsd = allOutputs.reduce((sum, o) => sum + o.estimatedCostUsd, 0);

  return {
    recommendation,
    structured: {
      ...primaryStructured,
      specialistInsights,
      disagreementsCount: disagreements.length,
      taskType: input.taskType,
      strategyApplied: true,
    },
    confidence: Math.min(0.99, weightedConfidence),
    disagreements,
    provenance,
    estimatedTotalCostUsd,
  };
}
