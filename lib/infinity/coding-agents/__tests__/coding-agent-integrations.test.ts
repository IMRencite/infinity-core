import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FounderIdeaStore } from "@/lib/infinity/founder-idea-lab/store";
import { submitFounderIdea } from "@/lib/infinity/founder-idea-lab/submit";
import { analyzeFounderIdea } from "@/lib/infinity/founder-idea-lab/analyze";
import { applyFounderDecision } from "@/lib/infinity/founder-idea-lab/decide";
import { routeFounderBuild } from "@/lib/infinity/founder-idea-lab/build-route";
import { runFounderIdeaCodingBuild } from "../founder-integrate";
import { executePabCodingTaskWithAgents, pabTaskToCanonical } from "../pab-adapter";
import { CodingAgentStore } from "../store";
import { buildCodingHqArtifacts, buildCodingHqReadModel } from "../hq/read-model";
import { codingRunPresence } from "../hq/presence";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { buildEntityDetail } from "@/lib/infinity/operator-console/details/build-entity-detail";
import { executeCodingAgentPipeline } from "../execute";
import { createInfinityNativeCoder, createMockCursorCodingAgentProvider } from "../providers/factory";
import { createCodingTask } from "../task";
import { sanitizeEnvForCursor, financialCredentialsAvailableToCursor } from "../security";
import { ORG_A, ORG_B } from "@/lib/infinity/treasury/__tests__/fixtures";
import type { CodingTask } from "@/lib/infinity/product-asset-builder/v2.1/types";

describe("coding-agent-founder-idea", () => {
  it("routes an approved founder BUILD through Coding Router without bypassing QA", async () => {
    const founderStore = new FounderIdeaStore();
    const codingStore = new CodingAgentStore();
    const submission = submitFounderIdea(founderStore, {
      organizationId: ORG_A,
      submittedByUserId: "user-a",
      title: "Simple SaaS that solves a clear business workflow.",
      description: "Simple SaaS that solves a clear business workflow.",
      idempotencyKey: "coding-founder",
    });
    analyzeFounderIdea(founderStore, submission, { researchFixture: "saas_workflow" });
    applyFounderDecision(founderStore, {
      submissionId: submission.id,
      action: "BUILD_THIS_BUSINESS",
      actorUserId: "user-a",
      actorOrganizationId: ORG_A,
    });
    const build = routeFounderBuild(founderStore, submission);
    const result = await runFounderIdeaCodingBuild({
      founderStore,
      submission,
      build,
      codingStore,
      preferMockCursor: true,
    });
    expect(result.codingTaskId).toBeTruthy();
    expect(result.codingAgentRunId).toBeTruthy();
    expect(result.codingProvider).toBe("mock_cursor");
    expect(result.codeChangeSetCreated).toBe(true);
    expect(result.productionArtifactCreated).toBe(true);
    expect(result.origin).toBe("FOUNDER_SUBMITTED");
    expect(result.treasuryBypassed).toBe(false);
    expect(result.publiclyDeployed).toBe(false);
    const run = codingStore.runs.get(result.codingAgentRunId!)!;
    expect(run.infinityAccepted).toBe(true);
    expect(run.founderIdeaSubmissionId).toBe(submission.id);
  });
});

describe("coding-agent-pab", () => {
  it("accepts a PAB CodingTask through the provider-neutral adapter", async () => {
    const pabTask: CodingTask = {
      id: "pab-task-1",
      buildRunId: "build-1",
      ventureId: "venture-1",
      featureContractIds: ["feat-1"],
      objective: "Implement collections feature",
      taskType: "IMPLEMENT_FEATURE",
      complexity: "low",
      repositoryContext: {
        fileTree: ["app/page.tsx"],
        packageSummary: {},
        frameworkHints: ["next"],
        relevantFiles: [],
        existingRoutes: [],
        existingEntities: [],
        featureContracts: [],
        priorFailures: [],
        reviewerFindings: [],
        tokenEstimate: 100,
      },
      relevantFiles: ["app/page.tsx"],
      allowedPaths: ["src", "app"],
      forbiddenPaths: [".env.local"],
      requirements: ["Create feature"],
      acceptanceCriteria: ["Tests pass"],
      dependencies: [],
      preferredCapabilities: [],
      maxFilesChanged: 3,
      retryLimit: 2,
      status: "pending",
    };
    const canonical = pabTaskToCanonical(ORG_A, pabTask);
    expect(canonical.taskId).toBe(pabTask.id);
    const executed = await executePabCodingTaskWithAgents({ organizationId: ORG_A, task: pabTask });
    expect(executed.provider).toBe("infinity_native");
    expect(executed.changeSet).toBeTruthy();
    expect(readFileSync(join(process.cwd(), "lib/infinity/product-asset-builder/v2.1/index.ts"), "utf8")).toContain("executePabCodingTaskWithAgents");
    expect(readFileSync(join(process.cwd(), "lib/infinity/coding-agents/pab-adapter.ts"), "utf8")).not.toContain("PAB_CURSOR");
  });
});

describe("coding-agent-hq", () => {
  it("builds Coding Intelligence artifacts for Creation Lab and reuses HQOutputDetail", async () => {
    const store = new CodingAgentStore();
    await executeCodingAgentPipeline({
      store,
      task: createCodingTask({
        organizationId: ORG_A,
        objective: "Large multi-file refactor with iterative tests",
        filesAffectedEstimate: 20,
        estimatedComplexity: "high",
        repository: { root: "/tmp/big", sizeClass: "large", fileCount: 200 },
        terminalNeeded: true,
        repositoryExplorationNeeded: true,
        debuggingDepth: "deep",
      }),
      native: createInfinityNativeCoder(),
      cursor: createMockCursorCodingAgentProvider(),
    });
    const model = buildCodingHqReadModel(store, ORG_A);
    expect(model.rows[0]?.provider).toBe("Cursor");
    const artifacts = buildCodingHqArtifacts(model);
    const runCard = artifacts.product_lab?.find((a) => a.artifactType === "coding_agent_run");
    expect(runCard?.subtitle).toMatch(/Cursor/);
    const providerCard = artifacts.product_lab?.find((a) => a.artifactType === "coding_provider" && a.title === "Cursor");
    expect(providerCard?.metadata.availability).toBe("AVAILABLE");
    expect(providerCard?.metadata.token).toBeNull();
    expect(providerCard?.metadata.apiKey).toBeNull();
    expect(codingRunPresence("RUNNING")).toBe("ACTIVE_WORK");
    expect(codingRunPresence("ACCEPTED")).toBe("PRESENT_IDLE");
    expect(codingRunPresence(null)).toBe("EMPTY");
    const inspector = buildArtifactInspectorModel(runCard!, artifacts.product_lab ?? []);
    const detail = buildEntityDetail(inspector);
    expect(detail.availableTabs).toEqual(expect.arrayContaining(["overview", "insights", "evidence", "system"]));
    const strip = readFileSync(join(process.cwd(), "components/dashboard/operator-console/coding-intelligence-strip.tsx"), "utf8");
    const consoleSource = readFileSync(join(process.cwd(), "components/dashboard/operator-console/venture-operator-console.tsx"), "utf8");
    expect(strip).toContain("Coding Intelligence");
    expect(strip).not.toMatch(/drawer|dialog/i);
    expect(strip).not.toMatch(/\borb\b/i);
    expect(consoleSource).toContain("CodingIntelligenceStrip");
    expect(readFileSync(join(process.cwd(), "components/dashboard/operator-console/artifacts/artifact-inspector-modal.tsx"), "utf8")).toContain("HQOutputDetail");
  });
});

describe("coding-agent-rls", () => {
  it("enables RLS without blanket policies and denies cross-org reads", async () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260818030000_coding_agent_adapter_v1.sql"), "utf8");
    expect(sql).toContain("ALTER TABLE public.coding_agent_runs ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("GRANT ALL ON public.coding_agent_runs TO service_role");
    expect(sql).not.toMatch(/CREATE POLICY/i);
    const store = new CodingAgentStore();
    await executeCodingAgentPipeline({
      store,
      task: createCodingTask({ organizationId: ORG_A, objective: "a" }),
      native: createInfinityNativeCoder(),
      cursor: createMockCursorCodingAgentProvider(),
    });
    await executeCodingAgentPipeline({
      store,
      task: createCodingTask({ organizationId: ORG_B, objective: "b" }),
      native: createInfinityNativeCoder(),
      cursor: createMockCursorCodingAgentProvider(),
    });
    expect(store.scoped(ORG_A).every((run) => run.organizationId === ORG_A)).toBe(true);
    expect(store.scoped(ORG_A).some((run) => run.organizationId === ORG_B)).toBe(false);
  });

  it("does not expose financial credentials to Cursor", () => {
    const sanitized = sanitizeEnvForCursor({
      STRIPE_SECRET_KEY: "sk-test",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      NAMECHEAP_API_KEY: "registrar-secret",
      NEXT_PUBLIC_SITE_URL: "https://example.com",
    });
    expect(financialCredentialsAvailableToCursor(sanitized)).toBe(false);
    expect(sanitized.NEXT_PUBLIC_SITE_URL).toBe("https://example.com");
    expect(sanitized.NAMECHEAP_API_KEY).toBeUndefined();
  });
});
