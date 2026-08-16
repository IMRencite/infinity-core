import { randomUUID } from "node:crypto";
import type { MediaCapability } from "../constants";
import type { MediaGenerationTask, MediaRoutingDecision } from "../types";
import {
  findCapableProviders,
  getProviderCapabilityRegistrations,
  type ProviderCapabilityRegistration,
} from "../registry/capability-registry";

export type RouteMediaTaskInput = {
  task: MediaGenerationTask;
  requiredCapabilities: MediaCapability[];
  qualityThreshold?: number;
  maxCostUsd?: number;
  requireReferenceSupport?: boolean;
  providerHealth?: Record<string, number>;
  preferEconomy?: boolean;
};

function scoreCandidate(
  entry: ProviderCapabilityRegistration,
  input: RouteMediaTaskInput,
): { fit: number; reasons: string[] } {
  const reasons: string[] = [];
  let fit = 0;

  const required = input.requiredCapabilities;
  const matched = required.filter((c) => entry.capabilities.includes(c)).length;
  fit += (matched / Math.max(required.length, 1)) * 40;
  reasons.push(`Capability fit ${matched}/${required.length}`);

  fit += entry.qualityScore * 25;
  fit += entry.reliabilityScore * 20;
  fit += entry.latencyScore * 10;

  const est =
    input.task.taskType.includes("VIDEO") || input.task.durationSec
      ? (entry.estimatedCostPerVideoSecondUsd ?? 0.1) * (input.task.durationSec ?? 5)
      : (entry.estimatedCostPerImageUsd ?? 0.05);
  if (input.maxCostUsd != null && est <= input.maxCostUsd) {
    fit += 10;
    reasons.push("Within cost ceiling");
  } else if (input.maxCostUsd != null) {
    fit -= 20;
    reasons.push("Exceeds cost ceiling");
  }

  if (input.requireReferenceSupport && entry.referenceInputSupport) {
    fit += 8;
    reasons.push("Reference input supported");
  } else if (input.requireReferenceSupport && !entry.referenceInputSupport) {
    fit -= 30;
    reasons.push("Reference input unsupported");
  }

  const health = input.providerHealth?.[entry.providerId] ?? 1;
  fit *= health;
  if (health < 1) reasons.push("Provider health degraded");

  if (input.preferEconomy && (entry.estimatedCostPerImageUsd ?? 1) < 0.01) {
    fit += 5;
    reasons.push("Economy tier eligible");
  }

  if ((input.qualityThreshold ?? 0) > 0.8 && entry.qualityScore < input.qualityThreshold!) {
    fit -= 15;
    reasons.push("Below quality threshold");
  }

  return { fit, reasons };
}

export function routeMediaGenerationTask(input: RouteMediaTaskInput): MediaRoutingDecision {
  const capable = findCapableProviders(input.requiredCapabilities);
  if (capable.length === 0) {
    throw new Error(
      `No provider registered for capabilities: ${input.requiredCapabilities.join(", ")}`,
    );
  }

  const candidates = capable.map((entry) => {
    const { fit, reasons } = scoreCandidate(entry, input);
    const accepted =
      fit >= 35 &&
      (!input.requireReferenceSupport || entry.referenceInputSupport) &&
      (input.maxCostUsd == null ||
        (entry.estimatedCostPerImageUsd ?? entry.estimatedCostPerVideoSecondUsd ?? 999) <=
          input.maxCostUsd);
    return {
      provider: entry.providerId,
      model: entry.model,
      capabilityFit: Math.round(fit * 100) / 100,
      qualityScore: entry.qualityScore,
      reliabilityScore: entry.reliabilityScore,
      estimatedCost:
        entry.estimatedCostPerImageUsd ??
        (entry.estimatedCostPerVideoSecondUsd ?? 0) * (input.task.durationSec ?? 5),
      latencyScore: entry.latencyScore,
      accepted,
      reasons,
    };
  });

  candidates.sort((a, b) => b.capabilityFit - a.capabilityFit);
  const selected = candidates.find((c) => c.accepted) ?? candidates[0]!;

  return {
    id: randomUUID(),
    taskId: input.task.taskId,
    selectedProvider: selected.provider,
    selectedModel: selected.model,
    candidates,
    decisionReasons: [
      `Selected ${selected.provider}/${selected.model} with fit ${selected.capabilityFit}`,
      ...selected.reasons,
    ],
  };
}

export function selectFallbackProvider(
  decision: MediaRoutingDecision,
  failedProvider: string,
): MediaRoutingDecision["candidates"][number] | null {
  return (
    decision.candidates.find((c) => c.accepted && c.provider !== failedProvider) ??
    decision.candidates.find((c) => c.provider !== failedProvider) ??
    null
  );
}

export function listRegisteredProviders(): string[] {
  return [...new Set(getProviderCapabilityRegistrations().map((r) => r.providerId))];
}
