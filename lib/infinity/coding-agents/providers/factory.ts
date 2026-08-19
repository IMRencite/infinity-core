import { CURSOR_CAPABILITIES, NATIVE_CAPABILITIES } from "../constants";
import type { CodingCapability, ProviderAvailability } from "../constants";
import type { CodeChangeSet } from "@/lib/infinity/product-asset-builder/v2.1/types";
import { commandLooksLikeExternalMutation, evaluatePathMutation } from "../policy";
import type {
  CodingAgentExecutionRequest,
  CodingAgentProvider,
  CodingAgentProviderResult,
  EpistemicCost,
} from "../types";

function knownZero(): EpistemicCost {
  return { value: 0, actuality: "ACTUAL", currency: "USD" };
}

function changeSet(taskId: string, provider: "infinity_native" | "cursor" | "mock_cursor", files: Array<{ path: string; content: string }>): CodeChangeSet {
  return {
    taskId,
    provider,
    model: provider === "infinity_native" ? "infinity-native-coder" : "cursor-mock",
    reasoningSummary: "Deterministic coding-agent adapter result",
    changes: files.map((file) => ({
      operation: "create",
      path: file.path,
      content: file.content,
      justification: "In-scope implementation",
    })),
    dependencyChanges: [],
    migrationChanges: [],
    testsAdded: files.filter((f) => f.path.includes("test")).map((f) => f.path),
    expectedBehavior: ["Feature compiles", "Tests pass"],
    assumptions: [],
  };
}

function successFiles(request: CodingAgentExecutionRequest, compileBroken = false) {
  const base = request.allowedPaths[0]?.replace(/\/$/, "") || "src";
  const content = compileBroken
    ? "export function broken(: never { return true }"
    : "export function featureReady(): boolean { return true; }\n";
  const test = compileBroken
    ? "import { featureReady } from './feature';\nthrow new Error('intentional qa failure');\n"
    : "import { featureReady } from './feature';\nif (!featureReady()) throw new Error('fail');\n";
  return [
    { path: `${base}/feature.ts`, content },
    { path: `${base}/feature.test.ts`, content: test },
  ];
}

export function createInfinityNativeCoder(): CodingAgentProvider {
  return {
    id: "infinity_native",
    displayName: "Infinity Native Coder",
    capabilities: [...NATIVE_CAPABILITIES],
    availability: () => "AVAILABLE",
    supports: (capability: CodingCapability) => NATIVE_CAPABILITIES.includes(capability),
    configuredModes: () => ["NATIVE"],
    execute(request) {
      const files = successFiles(request);
      const touches = files.map((file) => ({ path: file.path, operation: "create" as const }));
      return {
        provider: "infinity_native",
        executionMode: "NATIVE",
        status: "COMPLETED",
        failureCode: null,
        files: touches,
        commandsRun: [{ command: "npx tsc --noEmit", exitStatus: 0, durationMs: 12 }],
        testsRun: [{ name: "feature.test.ts", passed: true }],
        diff: files.map((f) => `+++ ${f.path}`).join("\n"),
        branch: request.branch,
        commitSha: null,
        durationMs: 40,
        cost: knownZero(),
        directoriesExplored: [request.workspace.root],
        filesRead: [],
        changeSet: changeSet(request.task.taskId, "infinity_native", files),
        externalActionRequirements: [],
      } satisfies CodingAgentProviderResult;
    },
  };
}

function cursorAvailability(): ProviderAvailability {
  const key = process.env.CURSOR_API_KEY?.trim();
  return key ? "AVAILABLE" : "NOT_CONFIGURED";
}

export function createCursorCodingAgentProvider(options?: { forceConfigured?: boolean }): CodingAgentProvider {
  return {
    id: "cursor",
    displayName: "Cursor",
    capabilities: [...CURSOR_CAPABILITIES],
    availability: () => (options?.forceConfigured ? "AVAILABLE" : cursorAvailability()),
    supports: (capability: CodingCapability) => CURSOR_CAPABILITIES.includes(capability),
    configuredModes: () => ["CURSOR_CLI", "CURSOR_CLOUD_AGENT"],
    execute(request) {
      if (!options?.forceConfigured && cursorAvailability() !== "AVAILABLE") {
        return {
          provider: "cursor",
          executionMode: request.executionMode === "CURSOR_CLOUD_AGENT" ? "CURSOR_CLOUD_AGENT" : "CURSOR_CLI",
          status: "FAILED",
          failureCode: "NOT_CONFIGURED",
          files: [],
          commandsRun: [],
          testsRun: [],
          diff: "",
          branch: request.branch,
          commitSha: null,
          durationMs: 0,
          cost: { value: null, actuality: "UNKNOWN", currency: "USD" },
          directoriesExplored: [],
          filesRead: [],
          changeSet: null,
          externalActionRequirements: [],
        };
      }
      return createMockCursorCodingAgentProvider().execute(request);
    },
  };
}

export function createMockCursorCodingAgentProvider(): CodingAgentProvider {
  return {
    id: "mock_cursor",
    displayName: "Mock Cursor",
    capabilities: [...CURSOR_CAPABILITIES],
    availability: () => "AVAILABLE",
    supports: (capability: CodingCapability) => CURSOR_CAPABILITIES.includes(capability),
    configuredModes: () => ["CURSOR_CLI", "CURSOR_CLOUD_AGENT"],
    execute(request) {
      const mode = request.executionMode === "CURSOR_CLOUD_AGENT" ? "CURSOR_CLOUD_AGENT" : "CURSOR_CLI";
      const simulation = request.simulation ?? "success";

      if (simulation === "timeout") {
        return {
          provider: "mock_cursor",
          executionMode: mode,
          status: "TIMEOUT",
          failureCode: "TIMEOUT",
          files: [],
          commandsRun: [],
          testsRun: [],
          diff: "",
          branch: request.branch,
          commitSha: null,
          durationMs: request.timeoutMs,
          cost: { value: 0.02, actuality: "ESTIMATE", currency: "USD" },
          directoriesExplored: [request.workspace.root],
          filesRead: [],
          changeSet: null,
          externalActionRequirements: [],
        };
      }

      if (simulation === "unavailable") {
        return {
          provider: "mock_cursor",
          executionMode: mode,
          status: "FAILED",
          failureCode: "PROVIDER_UNAVAILABLE",
          files: [],
          commandsRun: [],
          testsRun: [],
          diff: "",
          branch: request.branch,
          commitSha: null,
          durationMs: 1,
          cost: { value: null, actuality: "UNKNOWN", currency: "USD" },
          directoriesExplored: [],
          filesRead: [],
          changeSet: null,
          externalActionRequirements: [],
        };
      }

      if (simulation === "forbidden_path") {
        const path = ".env.local";
        const check = evaluatePathMutation(path, request.task);
        return {
          provider: "mock_cursor",
          executionMode: mode,
          status: "FAILED",
          failureCode: check.code ?? "WORKSPACE_VIOLATION",
          files: [{ path, operation: "modify" }],
          commandsRun: [],
          testsRun: [],
          diff: `+++ ${path}`,
          branch: request.branch,
          commitSha: null,
          durationMs: 8,
          cost: { value: 0.01, actuality: "ESTIMATE", currency: "USD" },
          directoriesExplored: [request.workspace.root],
          filesRead: [],
          changeSet: changeSet(request.task.taskId, "mock_cursor", [{ path, content: "SECRET=1" }]),
          externalActionRequirements: [],
        };
      }

      if (simulation === "external_action") {
        const command = "vercel deploy --prod";
        return {
          provider: "mock_cursor",
          executionMode: mode,
          status: "FAILED",
          failureCode: commandLooksLikeExternalMutation(command) ? "COMMAND_POLICY_VIOLATION" : "BUILD_FAILED",
          files: [],
          commandsRun: [{ command, exitStatus: 1, durationMs: 1, blocked: true, reason: "COMMAND_POLICY_VIOLATION" }],
          testsRun: [],
          diff: "",
          branch: request.branch,
          commitSha: null,
          durationMs: 5,
          cost: { value: 0, actuality: "ACTUAL", currency: "USD" },
          directoriesExplored: [],
          filesRead: [],
          changeSet: null,
          externalActionRequirements: [
            {
              actionType: "DEPLOYMENT",
              description: command,
              estimatedCost: { value: null, actuality: "UNKNOWN", currency: "USD" },
              requiresTreasury: true,
              requiresEag: true,
            },
          ],
        };
      }

      const broken = simulation === "compile_failure" || simulation === "qa_failure";
      const files = successFiles(request, broken);
      return {
        provider: "mock_cursor",
        executionMode: mode,
        status: "COMPLETED",
        failureCode: null,
        files: files.map((file) => ({ path: file.path, operation: "create" as const })),
        commandsRun: [
          { command: "npm test", exitStatus: broken ? 1 : 0, durationMs: 20 },
          { command: "npx tsc --noEmit", exitStatus: broken ? 1 : 0, durationMs: 15 },
        ],
        testsRun: [{ name: "feature.test.ts", passed: !broken }],
        diff: files.map((f) => `+++ ${f.path}`).join("\n"),
        branch: request.branch ?? "infinity/coding-agent",
        commitSha: request.allowCommit ? "abc1234" : null,
        durationMs: 90,
        cost: { value: 0.04, actuality: "ESTIMATE", currency: "USD" },
        directoriesExplored: [request.workspace.root, `${request.workspace.root}/src`],
        filesRead: [`${request.allowedPaths[0] ?? "src"}/index.ts`],
        changeSet: changeSet(request.task.taskId, "mock_cursor", files),
        externalActionRequirements: [],
      };
    },
  };
}
