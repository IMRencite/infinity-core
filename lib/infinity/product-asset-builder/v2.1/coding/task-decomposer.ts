import { randomUUID } from "node:crypto";
import type { FeatureContract } from "../../v2/types";
import type { CodingTask } from "../types";
import type { CodingTaskType } from "../constants";

function baseTask(
  partial: Omit<CodingTask, "id" | "buildRunId" | "status" | "repositoryContext"> & { id?: string },
): Omit<CodingTask, "buildRunId" | "status" | "repositoryContext"> {
  return {
    id: partial.id ?? randomUUID(),
    ventureId: partial.ventureId,
    featureContractIds: partial.featureContractIds,
    objective: partial.objective,
    taskType: partial.taskType,
    complexity: partial.complexity,
    relevantFiles: partial.relevantFiles,
    allowedPaths: partial.allowedPaths,
    forbiddenPaths: partial.forbiddenPaths,
    requirements: partial.requirements,
    acceptanceCriteria: partial.acceptanceCriteria,
    dependencies: partial.dependencies,
    preferredCapabilities: partial.preferredCapabilities,
    maxFilesChanged: partial.maxFilesChanged,
    maxTokens: partial.maxTokens,
    maxCostUsd: partial.maxCostUsd,
    retryLimit: partial.retryLimit,
    parentTaskId: partial.parentTaskId,
  };
}

export function decomposeCollectionsFeature(input: {
  ventureId: string;
  contract: FeatureContract;
}): Omit<CodingTask, "buildRunId" | "status" | "repositoryContext">[] {
  const fc = input.contract.featureId;
  const common = {
    ventureId: input.ventureId,
    featureContractIds: [fc],
    forbiddenPaths: [".env", ".env.local", "node_modules"],
    retryLimit: 3,
    maxFilesChanged: 12,
    maxCostUsd: 2,
  };

  const schemaId = randomUUID();
  const apiId = randomUUID();
  const uiId = randomUUID();
  const testsId = randomUUID();

  return [
    baseTask({
      ...common,
      id: schemaId,
      objective: "Extend DataStore with collections and collection_items entities plus helper functions",
      taskType: "IMPLEMENT_DATABASE" as CodingTaskType,
      complexity: "high",
      relevantFiles: ["lib/db/store.ts", "data/store.json"],
      allowedPaths: ["lib/db", "data"],
      requirements: [
        "Add Collection type with id, creatorId, slug, title, description, isPublic, createdAt, updatedAt",
        "Add CollectionItem linking collectionId to postId",
        "Extend DataStore, emptyStore, readStore",
        "Add canUserEditCollection(userId, collection) ownership helper",
        "Add CRUD helpers for collections and items",
      ],
      acceptanceCriteria: input.contract.acceptanceCriteria.slice(0, 3),
      dependencies: [],
      preferredCapabilities: ["coding", "structured_output"],
    }),
    baseTask({
      ...common,
      id: apiId,
      objective: "Implement collections REST API routes with auth and ownership enforcement",
      taskType: "IMPLEMENT_API" as CodingTaskType,
      complexity: "high",
      relevantFiles: ["lib/db/store.ts", "lib/auth/session.ts", "lib/api/helpers.ts", "app/api/posts/route.ts"],
      allowedPaths: ["app/api/collections", "lib"],
      requirements: [
        "GET/POST /api/collections",
        "GET/PATCH/DELETE /api/collections/[id]",
        "POST/DELETE /api/collections/[id]/items for add/remove artwork",
        "Creator-only mutations; public read for public collections",
        "Emit collection_created analytics event",
      ],
      acceptanceCriteria: input.contract.acceptanceCriteria,
      dependencies: [schemaId],
      preferredCapabilities: ["coding", "structured_output"],
      parentTaskId: schemaId,
    }),
    baseTask({
      ...common,
      id: uiId,
      objective: "Implement collection UI pages with SEO metadata and discovery",
      taskType: "IMPLEMENT_UI" as CodingTaskType,
      complexity: "medium",
      relevantFiles: ["app/creator/[id]/page.tsx", "components/SiteNav.tsx", "app/feed/page.tsx"],
      allowedPaths: ["app/collection", "app/dashboard/collections", "components", "app"],
      requirements: [
        "Public page /collection/[slug] listing collection artworks",
        "Creator dashboard /dashboard/collections for create/edit/delete",
        "Forms with validation feedback and empty/error states",
        "SEO metadata on public collection page",
        "Link from SiteNav when authenticated creator",
      ],
      acceptanceCriteria: input.contract.acceptanceCriteria,
      dependencies: [apiId],
      preferredCapabilities: ["coding"],
      parentTaskId: apiId,
    }),
    baseTask({
      ...common,
      id: testsId,
      objective: "Write vitest tests for collections ownership, CRUD, and public discovery",
      taskType: "WRITE_TESTS" as CodingTaskType,
      complexity: "medium",
      relevantFiles: ["__tests__/marketplace/auth-ownership.test.ts", "lib/db/store.ts"],
      allowedPaths: ["__tests__/marketplace", "lib/db"],
      requirements: [
        "Test creator can create/edit/delete own collection",
        "Test non-owner cannot mutate collection",
        "Test add/remove artwork from collection",
        "Test public collection visibility rules",
      ],
      acceptanceCriteria: ["All collection tests pass"],
      dependencies: [schemaId, apiId],
      preferredCapabilities: ["coding", "debugging"],
      parentTaskId: apiId,
    }),
  ];
}

export function createRepairCodingTask(input: {
  ventureId: string;
  featureContractIds: string[];
  repairContext: { failedGate: string; failureOutput: string; affectedFiles: string[]; attemptNumber: number };
}): Omit<CodingTask, "buildRunId" | "status" | "repositoryContext"> {
  const taskType: CodingTaskType =
    input.repairContext.failedGate === "unit_tests" || input.repairContext.failedGate.includes("test")
      ? "FIX_TESTS"
      : input.repairContext.failedGate === "typecheck" || input.repairContext.failedGate === "production_build"
        ? "FIX_BUILD"
        : "REVIEW_FIX";

  return baseTask({
    ventureId: input.ventureId,
    featureContractIds: input.featureContractIds,
    objective: `Repair ${input.repairContext.failedGate}: ${input.repairContext.failureOutput.slice(0, 500)}`,
    taskType,
    complexity: "medium",
    relevantFiles: input.repairContext.affectedFiles,
    allowedPaths: ["*"],
    forbiddenPaths: [".env", ".env.local"],
    requirements: ["Fix the smallest scope necessary", "Do not remove unrelated features"],
    acceptanceCriteria: [`${input.repairContext.failedGate} passes`],
    dependencies: [],
    preferredCapabilities: ["debugging", "coding"],
    maxFilesChanged: 8,
    retryLimit: 2,
    maxCostUsd: 1.5,
  });
}

export function createCreatorCollectionsContract(): FeatureContract {
  return {
    featureId: "creator_collections",
    featureName: "Creator Collections",
    businessPurpose: "Allow creators to curate artwork/posts into public collections",
    userRoles: ["creator", "consumer"],
    functionalRequirements: [
      "authenticated creators create collections",
      "collections contain multiple artworks/posts",
      "public collection pages",
      "creator ownership enforcement",
      "edit/delete collection",
      "add/remove artwork",
      "collection metadata",
      "public discovery",
    ],
    nonFunctionalRequirements: ["type-safe", "tested", "responsive"],
    dependencies: ["auth_system", "content_posts", "creator_profiles"],
    requiredRoutes: ["/collection/[slug]", "/dashboard/collections"],
    requiredDataEntities: ["collections", "collection_items"],
    requiredAPIs: ["/api/collections", "/api/collections/[id]", "/api/collections/[id]/items"],
    requiredUIStates: ["loading", "empty", "error", "edit"],
    requiredErrorStates: ["unauthorized", "not_found", "forbidden"],
    requiredAnalyticsEvents: ["collection_created", "collection_viewed"],
    requiredTests: ["collections.test.ts"],
    acceptanceCriteria: [
      "Creator can create collection with title and description",
      "Creator can add/remove posts to collection",
      "Public collection page renders for public collections",
      "Non-owner cannot edit collection",
      "Collection slug is unique per creator",
    ],
    revenueRelationship: "engagement_retention",
    status: "PLANNED",
  };
}
