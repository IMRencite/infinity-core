import { randomUUID } from "node:crypto";
import { bootstrapAiProviders } from "@/lib/infinity/ai-providers/bootstrap";
import { loadAiProviderEnvConfig, mayExecuteProvider } from "@/lib/infinity/ai-providers/config";
import { selectAiProvider } from "@/lib/infinity/ai-providers/registry";
import type { AiProviderAdapter } from "@/lib/infinity/ai-providers/types";
import { composeGroundedHqCopilotAnswer, finalizeHqCopilotAnswer } from "./answer-engine";
import { buildHqCopilotContext, type HqCopilotReadRuntime } from "./context-builder";
import { answerConflictsWithFacts, validateCopilotSources } from "./grounding";
import { MAX_COPILOT_CONVERSATION_TURNS, MAX_COPILOT_QUESTION_CHARS, type HqCopilotQuery, type HqCopilotResponse } from "./types";
import { routeHqCopilotQuery } from "./query-router";

export type AnswerHqCopilotQueryInput = {
  query: HqCopilotQuery;
  runtime: HqCopilotReadRuntime;
  provider?: AiProviderAdapter | null;
};

function boundQuery(query: HqCopilotQuery): HqCopilotQuery {
  return {
    ...query,
    question: query.question.slice(0, MAX_COPILOT_QUESTION_CHARS),
    conversation: (query.conversation ?? []).slice(-MAX_COPILOT_CONVERSATION_TURNS),
  };
}

function resolveReportingProvider(override?: AiProviderAdapter | null): AiProviderAdapter | null {
  if (override) return override;
  bootstrapAiProviders();
  const config = loadAiProviderEnvConfig();
  const preferred =
    config.defaultProviderId !== "mock" && mayExecuteProvider(config.defaultProviderId, config)
      ? config.defaultProviderId
      : "mock";
  return selectAiProvider({
    preferredProviderId: preferred,
    fallbackProviderIds: ["mock"],
  });
}

export async function answerHqCopilotQuery(input: AnswerHqCopilotQueryInput): Promise<HqCopilotResponse> {
  const started = Date.now();
  const query = boundQuery(input.query);
  const route = routeHqCopilotQuery(query.question);
  const provider = resolveReportingProvider(input.provider);
  const modelId = provider ? (await provider.listModels())[0]?.id ?? "hq-copilot-report" : null;

  if (route.intent === "FORBIDDEN_ACTION" || route.intent === "NAVIGATION_REQUEST") {
    const composed = finalizeHqCopilotAnswer(
      composeGroundedHqCopilotAnswer({ query, route, context: null }),
      query.question,
    );
    return {
      ...composed,
      intent: route.intent,
      capability: route.capability,
      latencyMs: Date.now() - started,
      provider: provider?.id ?? null,
      model: modelId,
      costUsd: 0,
      inputChars: query.question.length,
      outputChars: composed.answer.length,
    };
  }

  const context = await buildHqCopilotContext({
    query,
    route,
    runtime: input.runtime,
  });

  let composed = finalizeHqCopilotAnswer(
    composeGroundedHqCopilotAnswer({ query, route, context }),
    query.question,
  );
  composed = {
    ...composed,
    sources: validateCopilotSources(composed.sources, context),
  };

  let costUsd = 0;
  if (provider && composed.groundingStatus === "GROUNDED") {
    const tokenEstimate = provider.estimateTokens({
      prompt: context.factText,
      systemPrompt: "Infinity HQ reporting interface. Report recorded state only.",
    });
    const cost = provider.estimateCost({ modelId: modelId ?? "hq-copilot-report", tokenEstimate });
    costUsd = cost.totalCost ?? 0;
    try {
      const executed = await provider.execute({
        correlationId: query.conversationId ?? randomUUID(),
        modelId: modelId ?? "hq-copilot-report",
        prompt: `Question: ${query.question}\nRecorded Infinity facts:\n${context.factText}\nReturn JSON advisory summarizing only those facts.`,
        systemPrompt: "Infinity HQ reporting interface. Report recorded state only. Advisory only.",
        requireJson: true,
      });
      costUsd = executed.costEstimate.totalCost ?? costUsd;
      const candidate = executed.structured.summary;
      const usesRetrievedFact = context.facts.some(
        (fact) => fact.length > 24 && candidate.includes(fact.slice(0, 24)),
      );
      if (
        provider.id !== "mock" &&
        candidate &&
        usesRetrievedFact &&
        !answerConflictsWithFacts(candidate, context) &&
        !/should (fund|kill|launch|prioritize)/i.test(candidate)
      ) {
        composed = {
          ...composed,
          answer: candidate,
          sources: validateCopilotSources(composed.sources, context),
        };
      }
    } catch {
      // Canonical fact answer remains authoritative.
    }
  }

  return {
    ...composed,
    intent: route.intent,
    capability: route.capability,
    latencyMs: Date.now() - started,
    provider: provider?.id ?? null,
    model: modelId,
    costUsd,
    inputChars: query.question.length + context.factText.length,
    outputChars: composed.answer.length,
  };
}
