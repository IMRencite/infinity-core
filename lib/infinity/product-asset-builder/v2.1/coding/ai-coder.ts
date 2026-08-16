import { randomUUID } from "node:crypto";
import { buildMockCollectionsChanges } from "./mock-collections-coder";
import { executeLiveCodingRequest } from "@/lib/infinity/multi-brain/coding/live-coding-client";
import { CODE_CHANGE_SET_SCHEMA } from "./code-change-schema";
import {
  parseCodeChangeSetFromCodingOutput,
  parseExtendedCodeChangeSet,
  validateCodeChangeSet,
} from "./code-change-schema";
import { formatContextForPrompt } from "../context/repository-context-engine";
import { routeCodingTask, selectCodingFallback } from "../routing/coding-router";
import { normalizeProviderUsage } from "../telemetry/usage-telemetry";
import type { CodeChangeSet, CodingTask, ProviderUsageRecord, ReviewFinding } from "../types";
import { getConfiguredLiveProviders } from "../../v2/providers/preflight";

export type AiCoderResult = {
  changeSet: CodeChangeSet | null;
  usage: ProviderUsageRecord;
  reviewUsage: ProviderUsageRecord | null;
  reviewFindings: ReviewFinding[];
  routing: ReturnType<typeof routeCodingTask>;
  implementerProvider: string;
  reviewerProvider: string | null;
  independentReview: boolean;
};

const CODING_SYSTEM_PROMPT = `You are an expert software engineer implementing features in an isolated Next.js venture workspace.
Return JSON with exactly these fields:
- files: array of { path: string, operation: "CREATE"|"PATCH", content: string } where content is the FULL file body
- summary: string describing what you implemented
- tests: optional array of test file paths added

Rules:
- Use relative paths only (no leading slash, no ..)
- operation CREATE for new files, PATCH for full-file replacements of existing files
- Follow existing patterns in lib/db/store.ts and app/api routes
- TypeScript strict mode compatible code
- Do not modify .env files or include secrets`;

export async function executeCodingTask(input: {
  task: CodingTask;
  liveMode: boolean;
  simulatedOutage?: string;
  priorFailures?: string[];
}): Promise<AiCoderResult> {
  const available = input.liveMode
    ? getConfiguredLiveProviders().filter((p) => p !== input.simulatedOutage)
    : ["mock"];

  const routing = routeCodingTask({
    taskType: input.task.taskType,
    complexity: input.task.complexity === "critical" ? "critical" : input.task.complexity === "high" ? "high" : input.task.complexity === "low" ? "low" : "medium",
    economicImportance: 0.7,
    implementationRisk: input.task.taskType.startsWith("FIX") ? 0.6 : 0.5,
    availableProviders: available,
  });

  const contextBlock = formatContextForPrompt(input.task.repositoryContext);
  const userPrompt = [
    `# Task: ${input.task.objective}`,
    `Task type: ${input.task.taskType}`,
    `Requirements:\n${input.task.requirements.map((r) => `- ${r}`).join("\n")}`,
    `Acceptance criteria:\n${input.task.acceptanceCriteria.map((a) => `- ${a}`).join("\n")}`,
    `Allowed paths: ${input.task.allowedPaths.join(", ")}`,
    contextBlock,
  ].join("\n\n");

  let implementerProvider = routing.implementer.provider;
  let modelId = routing.implementer.modelId;
  let codingResult = await callImplementer({
    provider: implementerProvider,
    modelId,
    task: input.task,
    userPrompt,
    liveMode: input.liveMode,
  });

  if ((!codingResult.success || !codingResult.rawText) && input.liveMode) {
    const tried = new Set([implementerProvider]);
    for (const fallback of available) {
      if (tried.has(fallback)) continue;
      tried.add(fallback);
      const models: Record<string, string> = {
        openai: "gpt-4.1-mini",
        anthropic: "claude-sonnet-4-20250514",
        gemini: "gemini-2.0-flash",
        xai: "grok-3-mini",
      };
      implementerProvider = fallback;
      modelId = models[fallback] ?? modelId;
      codingResult = await callImplementer({
        provider: implementerProvider,
        modelId,
        task: input.task,
        userPrompt,
        liveMode: input.liveMode,
      });
      if (codingResult.success && codingResult.rawText) break;
    }
  }

  const usage = normalizeProviderUsage({
    provider: implementerProvider,
    modelId,
    role: "implementer",
    taskType: input.task.taskType,
    codingTaskId: input.task.id,
    systemPrompt: CODING_SYSTEM_PROMPT,
    userPrompt,
    result: codingResult,
  });

  let changeSet: CodeChangeSet | null = null;
  if (codingResult.success && codingResult.rawText) {
    try {
      if (codingResult.coding?.files?.length) {
        changeSet = parseCodeChangeSetFromCodingOutput(
          input.task.id,
          implementerProvider,
          modelId,
          codingResult.coding,
        );
      } else {
        const parsed = JSON.parse(codingResult.rawText) as {
          files?: Array<{ path: string; operation: string; content: string }>;
          changes?: Array<{ operation: string; path: string; content?: string; justification?: string }>;
          summary?: string;
          reasoningSummary?: string;
        };
        if (parsed.files?.length) {
          changeSet = parseCodeChangeSetFromCodingOutput(input.task.id, implementerProvider, modelId, {
            files: parsed.files.map((f) => ({
              path: f.path,
              operation: f.operation === "PATCH" ? "PATCH" : "CREATE",
              content: f.content,
            })),
            summary: parsed.summary ?? "AI coding output",
          });
        } else if (parsed.changes?.length) {
          changeSet = parseExtendedCodeChangeSet(
            input.task.id,
            implementerProvider,
            modelId,
            JSON.stringify({
              reasoningSummary: parsed.reasoningSummary ?? parsed.summary ?? "AI coding output",
              changes: parsed.changes,
            }),
          );
        }
      }
    } catch (parseErr) {
      usage.error = parseErr instanceof Error ? parseErr.message : String(parseErr);
      usage.success = false;
    }
  }

  if (changeSet) {
    const validation = validateCodeChangeSet(changeSet, {
      allowedPaths: input.task.allowedPaths.length ? input.task.allowedPaths : ["*"],
      forbiddenPaths: input.task.forbiddenPaths,
      allowDelete: false,
      maxChanges: input.task.maxFilesChanged,
      maxContentBytes: 512_000,
    });
    if (!validation.valid) {
      changeSet = null;
      usage.error = validation.errors.join("; ");
      usage.success = false;
    }
  }

  const reviewFindings: ReviewFinding[] = [];
  let reviewerProvider: string | null = null;
  let independentReview = false;
  let reviewUsage: ProviderUsageRecord | null = null;

  if (changeSet && input.liveMode) {
    const models: Record<string, string> = {
      openai: "gpt-4.1-mini",
      anthropic: "claude-sonnet-4-20250514",
      gemini: "gemini-2.0-flash",
      xai: "grok-3-mini",
    };
    let reviewProvider = routing.reviewer?.provider ?? null;
    let reviewModel = routing.reviewer?.modelId ?? "";
    if (!reviewProvider || reviewProvider === implementerProvider) {
      const alt = available.find((p) => p !== implementerProvider);
      if (alt) {
        reviewProvider = alt;
        reviewModel = models[alt] ?? reviewModel;
        independentReview = true;
      }
    } else {
      independentReview = routing.independenceEnforced && reviewProvider !== implementerProvider;
    }

    if (reviewProvider) {
      reviewerProvider = reviewProvider;
      const reviewPrompt = [
      `Review this implementation for FeatureContract compliance, security, auth, and correctness.`,
      `Task: ${input.task.objective}`,
      `Changes summary: ${changeSet.reasoningSummary}`,
      `Files changed: ${changeSet.changes.map((c) => c.path).join(", ")}`,
      contextBlock,
    ].join("\n\n");

    const reviewResult = await executeLiveCodingRequest({
      provider: reviewProvider,
      modelId: reviewModel,
      role: "reviewer",
      taskType: `${input.task.taskType}_review`,
      systemPrompt: "Return JSON review with defects array. Severity: critical|high|medium|low.",
      userPrompt: reviewPrompt,
      outputMode: "review",
    });

    reviewUsage = normalizeProviderUsage({
      provider: reviewProvider,
      modelId: reviewModel,
      role: "reviewer",
      taskType: `${input.task.taskType}_review`,
      codingTaskId: input.task.id,
      systemPrompt: "review",
      userPrompt: reviewPrompt,
      result: reviewResult,
    });

    if (reviewResult.review?.defects) {
      for (const d of reviewResult.review.defects) {
        reviewFindings.push({
          defectType: d.defectType,
          severity: d.severity.toUpperCase() as ReviewFinding["severity"],
          description: d.description,
          filePath: d.filePath,
          featureId: input.task.featureContractIds[0],
          provider: reviewProvider,
          model: reviewModel,
          resolved: false,
        });
      }
    }
    }
  }

  return {
    changeSet,
    usage,
    reviewUsage,
    reviewFindings,
    routing,
    implementerProvider,
    reviewerProvider,
    independentReview,
  };
}

async function callImplementer(input: {
  provider: string;
  modelId: string;
  task: CodingTask;
  userPrompt: string;
  liveMode: boolean;
}) {
  if (!input.liveMode) {
    return buildMockCodingResult(input.task);
  }
  return executeLiveCodingRequest({
    provider: input.provider,
    modelId: input.modelId,
    role: "specialist",
    taskType: input.task.taskType,
    systemPrompt: CODING_SYSTEM_PROMPT,
    userPrompt: input.userPrompt,
    outputMode: "coding",
    timeoutMs: 120_000,
  });
}

function buildMockCodingResult(task: CodingTask): import("@/lib/infinity/multi-brain/coding/live-coding-client").LiveCodingResult {
  const changes = buildMockCollectionsChanges(task);
  const rawText = JSON.stringify({ files: changes, summary: "Mock collections implementation" });
  return {
    provider: "mock",
    modelId: "mock-coder",
    rawText,
    inputTokens: 500,
    outputTokens: 2000,
    cachedTokens: 0,
    reasoningTokens: 0,
    totalTokens: 2500,
    estimatedCostUsd: 0.001,
    latencyMs: 10,
    usageSource: "provider",
    success: true,
    coding: { files: changes, summary: "Mock collections implementation" },
  };
}

export { CODE_CHANGE_SET_SCHEMA, parseExtendedCodeChangeSet };
